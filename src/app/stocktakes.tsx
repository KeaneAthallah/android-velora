import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { ClipboardList } from "lucide-react-native";
import { useTheme } from "@/theme";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import {
  useCancelStocktakeMutation,
  useCreateStocktakeMutation,
  usePostStocktakeMutation,
  useSaveStocktakeCountsMutation,
  useStocktake,
  useStocktakes,
} from "@/features/stocktakes/use-stocktakes";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Screen } from "@/components/ui/screen";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import type { Stocktake } from "@/api/types";

const OPEN_STATUSES = ["draft", "in_progress"];

function statusTone(status: string): BadgeTone {
  if (status === "completed") return "success";
  if (status === "cancelled") return "danger";
  if (status === "in_progress") return "info";
  return "warning";
}

function statusLabel(status: string) {
  return status === "in_progress"
    ? "Counting"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

function countedProgress(stocktake: Stocktake) {
  // A line counted as zero is indistinguishable from an uncounted one in the
  // API, so this is "lines with a non-zero count", not a completion measure.
  const withCount = stocktake.items.filter(
    (item) => Number(item.countedQuantity) > 0,
  ).length;
  return `${withCount}/${stocktake.items.length} with a count`;
}

type CloseAction = "post" | "cancel" | null;

export default function StocktakesScreen() {
  const { colors } = useTheme();
  const { has } = usePermissions();
  const { outlet, outlets } = useTenant();

  const stocktakesQuery = useStocktakes();
  const createMutation = useCreateStocktakeMutation();
  const saveMutation = useSaveStocktakeCountsMutation();
  const postMutation = usePostStocktakeMutation();
  const cancelMutation = useCancelStocktakeMutation();

  const [openId, setOpenId] = useState<string | null>(null);
  const detailQuery = useStocktake(openId);

  // Only lines the user actually touched live here; everything else reads the
  // server's stored count, so opening the sheet never needs an effect.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState<CloseAction>(null);

  const outletName = useMemo(() => {
    const lookup = new Map(outlets.map((item) => [item.id, item.name]));
    return (id: string) => lookup.get(id) ?? `Outlet #${id}`;
  }, [outlets]);

  const detail = detailQuery.data ?? null;

  const countFor = (itemId: string, stored: string) =>
    edits[itemId] ?? stored;

  if (!has("inventory.view")) {
    return (
      <Screen>
        <AppHeader title="Stocktakes" subtitle="Physical counts" showBack />
        <View style={styles.stateWrap}>
          <ErrorState
            forbidden
            title="Stocktakes not enabled for your role"
            message="A manager can grant inventory view."
          />
        </View>
      </Screen>
    );
  }

  const canAdjust = has("inventory.adjust");
  const editable = detail != null && OPEN_STATUSES.includes(detail.status);

  const stocktakes = stocktakesQuery.data ?? [];

  const allZero =
    detail != null &&
    detail.items.length > 0 &&
    detail.items.every(
      (item) => Number(countFor(item.id, item.countedQuantity)) === 0,
    );
  const stockOnHand = detail
    ? detail.items.some((item) => Number(item.expectedQuantity) > 0)
    : false;

  const startCount = async () => {
    if (!outlet) return;
    setError(null);
    try {
      const created = await createMutation.mutateAsync({ outletId: outlet.id });
      setEdits({});
      setOpenId(created.id);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not start the stocktake.",
      );
    }
  };

  const saveCounts = async () => {
    if (!detail) return false;
    setError(null);
    try {
      await saveMutation.mutateAsync({
        id: detail.id,
        items: detail.items.map((item) => ({
          id: item.id,
          countedQuantity:
            Number(countFor(item.id, item.countedQuantity)) || 0,
        })),
      });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the counts.");
      return false;
    }
  };

  const closeCount = async (action: "post" | "cancel") => {
    if (!detail) return;
    setError(null);

    // Posting writes whatever the server has stored, so flush the sheet's
    // numbers first — otherwise the last typed count is silently dropped.
    if (action === "post" && !(await saveCounts())) {
      setClosing(null);
      return;
    }

    try {
      if (action === "post") {
        await postMutation.mutateAsync({
          id: detail.id,
          // The API refuses an all-zero count while stock is on hand until the
          // wipe is acknowledged; the dialog wording is that acknowledgement.
          confirmZeroCount: allZero && stockOnHand,
        });
      } else {
        await cancelMutation.mutateAsync(detail.id);
      }
      setClosing(null);
      setOpenId(null);
    } catch (e) {
      setClosing(null);
      setError(
        e instanceof Error
          ? e.message
          : `Could not ${action === "post" ? "post" : "cancel"} the stocktake.`,
      );
    }
  };

  const busy =
    saveMutation.isPending || postMutation.isPending || cancelMutation.isPending;

  return (
    <Screen>
      <AppHeader
        title="Stocktakes"
        subtitle={`${stocktakes.length} ${stocktakes.length === 1 ? "count" : "counts"}`}
        showBack
        right={
          canAdjust && outlet ? (
            <Button
              label="New count"
              size="sm"
              onPress={() => void startCount()}
              loading={createMutation.isPending}
              disabled={createMutation.isPending}
            />
          ) : undefined
        }
      />

      {error && !openId ? (
        <View style={styles.banner}>
          <Text variant="caption" color={colors.danger}>
            {error}
          </Text>
        </View>
      ) : null}

      {stocktakesQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} height={88} radius={12} />
          ))}
        </View>
      ) : stocktakesQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            message={
              stocktakesQuery.error instanceof Error
                ? stocktakesQuery.error.message
                : "Could not load stocktakes."
            }
            onRetry={() => void stocktakesQuery.refetch()}
          />
        </View>
      ) : stocktakes.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState
            icon={ClipboardList}
            title="No counts yet"
            description={
              canAdjust
                ? "Start a count to snapshot this outlet's stock, then enter what you physically counted."
                : "Counts started on the web app appear here."
            }
            actionLabel={canAdjust && outlet ? "Start a count" : undefined}
            onAction={canAdjust && outlet ? () => void startCount() : undefined}
          />
        </View>
      ) : (
        <FlatList
          data={stocktakes}
          keyExtractor={(stocktake) => stocktake.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={
                stocktakesQuery.isRefetching && !stocktakesQuery.isLoading
              }
              onRefresh={() => void stocktakesQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open stocktake ${item.id}`}
              onPress={() => {
                setError(null);
                setEdits({});
                setOpenId(item.id);
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Card style={styles.row}>
                <View style={styles.rowTop}>
                  <Text variant="body">Count #{item.id}</Text>
                  <Badge
                    label={statusLabel(item.status)}
                    tone={statusTone(item.status)}
                  />
                </View>
                <Text variant="caption" numberOfLines={1}>
                  {item.outletName ?? outletName(item.outletId)} ·{" "}
                  {countedProgress(item)}
                </Text>
                <Text variant="caption" color={colors.inkSecondary}>
                  Started {formatDateTime(item.createdAt)}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}

      <Sheet
        visible={openId != null}
        onClose={() => {
          setOpenId(null);
          setError(null);
        }}
        title={detail ? `Count #${detail.id}` : "Stocktake"}
        description={
          detail
            ? `${detail.outletName ?? outletName(detail.outletId)} · ${statusLabel(detail.status)}`
            : undefined
        }
      >
        {openId ? (
          <View style={styles.sheetBody}>
            {detailQuery.isError && !detail ? (
              <ErrorState
                message={
                  detailQuery.error instanceof Error
                    ? detailQuery.error.message
                    : "Could not load this count."
                }
                onRetry={() => void detailQuery.refetch()}
              />
            ) : !detail || detailQuery.isLoading ? (
              <Skeleton height={160} radius={12} />
            ) : (
              <>
                <Text variant="caption">
                  Enter what you physically counted. Expected comes from the
                  balance at the moment the count was started; posting writes the
                  difference.
                </Text>

                <Card padded={false} style={styles.lines}>
                  {detail.items.map((item, index) => (
                    <View key={item.id}>
                      {index > 0 ? (
                        <View
                          style={[styles.separator, { backgroundColor: colors.border }]}
                        />
                      ) : null}
                      <View style={styles.lineRow}>
                        <View style={styles.lineText}>
                          <Text variant="bodySmall" numberOfLines={1}>
                            {item.productName}
                          </Text>
                          <Text variant="caption">
                            {item.sku ? `${item.sku} · ` : ""}expected{" "}
                            {formatQuantity(item.expectedQuantity)}
                          </Text>
                        </View>
                        <TextField
                          value={countFor(item.id, item.countedQuantity)}
                          onChangeText={(value) =>
                            setEdits((current) => ({
                              ...current,
                              [item.id]: value.replace(/[^0-9.]/g, ""),
                            }))
                          }
                          keyboardType="decimal-pad"
                          editable={editable && canAdjust}
                          containerStyle={styles.countField}
                          accessibilityLabel={`Counted quantity for ${item.productName}`}
                        />
                      </View>
                    </View>
                  ))}
                </Card>

                {error ? (
                  <Text variant="caption" color={colors.danger}>
                    {error}
                  </Text>
                ) : null}

                {editable && canAdjust ? (
                  <View style={styles.actions}>
                    <Button
                      label={saveMutation.isPending ? "Saving…" : "Save counts"}
                      variant="secondary"
                      onPress={() => void saveCounts()}
                      loading={saveMutation.isPending}
                      disabled={busy}
                      fullWidth
                    />
                    <Button
                      label="Post stocktake"
                      onPress={() => setClosing("post")}
                      disabled={busy}
                      fullWidth
                    />
                    <Button
                      label="Cancel count"
                      variant="ghost"
                      onPress={() => setClosing("cancel")}
                      disabled={busy}
                      fullWidth
                    />
                  </View>
                ) : (
                  <Text variant="caption">
                    {OPEN_STATUSES.includes(detail.status)
                      ? "Counting and posting need inventory.adjust."
                      : `This count is ${statusLabel(detail.status).toLowerCase()} and can no longer change stock.`}
                  </Text>
                )}
              </>
            )}
          </View>
        ) : null}
      </Sheet>

      <ConfirmDialog
        visible={closing != null}
        title={
          closing === "cancel"
            ? "Cancel this count?"
            : allZero && stockOnHand
              ? "Write off every line?"
              : "Post this stocktake?"
        }
        message={
          closing === "cancel"
            ? "The count closes without changing stock. Counted numbers are kept for the record."
            : allZero && stockOnHand
              ? "Every line is counted as zero while stock is on hand. Posting wipes this outlet's balances for these products."
              : "Posting adjusts stock to the counted quantities and records a movement per changed line."
        }
        confirmLabel={closing === "cancel" ? "Cancel count" : "Post stocktake"}
        cancelLabel={closing === "cancel" ? "Keep counting" : "Not yet"}
        tone={closing === "cancel" ? "danger" : "primary"}
        // Saving happens before posting, so both count as in-flight here —
        // otherwise a second tap could fire save + post twice.
        loading={busy}
        onConfirm={() =>
          closing ? void closeCount(closing === "cancel" ? "cancel" : "post") : undefined
        }
        onCancel={() => setClosing(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { paddingHorizontal: 16, paddingBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  row: { gap: 4 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  skeletonWrap: { paddingHorizontal: 16, gap: 10 },
  sheetBody: { gap: 12, paddingBottom: 8 },
  lines: { paddingVertical: 2 },
  separator: { height: StyleSheet.hairlineWidth },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  lineText: { flex: 1, gap: 1 },
  countField: { width: 96 },
  actions: { gap: 8 },
});
