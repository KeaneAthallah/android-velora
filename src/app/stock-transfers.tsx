import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ArrowLeftRight, ArrowRight } from "lucide-react-native";
import { useTheme } from "@/theme";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import {
  useCompleteStockTransferMutation,
  useStockTransfers,
} from "@/features/stock-transfers/use-stock-transfers";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Divider } from "@/components/ui/divider";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Screen } from "@/components/ui/screen";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import type { StockTransfer } from "@/api/types";

const OPEN_STATUSES = ["draft", "approved", "in_transit"];

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function statusTone(status: string): BadgeTone {
  if (status === "completed") return "success";
  if (status === "cancelled") return "danger";
  if (status === "in_transit" || status === "approved") return "info";
  return "warning";
}

function statusLabel(status: string) {
  if (status === "in_transit") return "In transit";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function StockTransfersScreen() {
  const { colors } = useTheme();
  const { has } = usePermissions();
  const { outlets } = useTenant();
  const transfersQuery = useStockTransfers();
  const completeMutation = useCompleteStockTransferMutation();

  const [filter, setFilter] = useState<FilterKey>("open");
  const [detail, setDetail] = useState<StockTransfer | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outletName = useMemo(() => {
    const lookup = new Map(outlets.map((outlet) => [outlet.id, outlet.name]));
    return (id: string) => lookup.get(id) ?? `Outlet #${id}`;
  }, [outlets]);

  const transfers = useMemo(() => {
    const rows = transfersQuery.data ?? [];
    if (filter === "all") return rows;
    if (filter === "completed") {
      return rows.filter((transfer) => transfer.status === "completed");
    }
    return rows.filter((transfer) => OPEN_STATUSES.includes(transfer.status));
  }, [transfersQuery.data, filter]);

  if (!has("inventory.view")) {
    return (
      <Screen>
        <AppHeader title="Stock transfers" subtitle="Between outlets" showBack />
        <View style={styles.stateWrap}>
          <ErrorState
            forbidden
            title="Stock transfers not enabled for your role"
            message="A manager can grant inventory view."
          />
        </View>
      </Screen>
    );
  }

  const canAdjust = has("inventory.adjust");

  const complete = async (transfer: StockTransfer) => {
    setError(null);
    try {
      const updated = await completeMutation.mutateAsync(transfer.id);
      setConfirming(false);
      setDetail(updated);
    } catch (e) {
      setConfirming(false);
      setError(
        e instanceof Error ? e.message : "Could not complete the transfer.",
      );
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Stock transfers"
        subtitle={`${transfers.length} shown`}
        showBack
      />

      <View style={styles.controls}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {FILTERS.map((option) => {
            const active = filter === option.key;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(option.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  variant="bodySmall"
                  color={active ? colors.primaryForeground : colors.inkSecondary}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {transfersQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} height={96} radius={12} />
          ))}
        </View>
      ) : transfersQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            message={
              transfersQuery.error instanceof Error
                ? transfersQuery.error.message
                : "Could not load transfers."
            }
            onRetry={() => void transfersQuery.refetch()}
          />
        </View>
      ) : transfers.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState
            icon={ArrowLeftRight}
            title={filter === "open" ? "No open transfers" : "Nothing here yet"}
            description={
              filter === "open"
                ? "Drafts created on the web app appear here and move stock when completed."
                : "Switch the filter to see the other transfers."
            }
            actionLabel="Show all"
            onAction={() => setFilter("all")}
          />
        </View>
      ) : (
        <FlatList
          data={transfers}
          keyExtractor={(transfer) => transfer.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={transfersQuery.isRefetching && !transfersQuery.isLoading}
              onRefresh={() => void transfersQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open transfer ${item.id}`}
              onPress={() => {
                setError(null);
                setDetail(item);
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Card style={styles.row}>
                <View style={styles.rowTop}>
                  <Text variant="bodySmall" color={colors.inkSecondary}>
                    #{item.id} · {formatDateTime(item.createdAt)}
                  </Text>
                  <Badge
                    label={statusLabel(item.status)}
                    tone={statusTone(item.status)}
                  />
                </View>

                <View style={styles.route}>
                  <Text variant="body" numberOfLines={1} style={styles.routeText}>
                    {outletName(item.fromOutletId)}
                  </Text>
                  <ArrowRight size={15} color={colors.inkMuted} />
                  <Text variant="body" numberOfLines={1} style={styles.routeText}>
                    {outletName(item.toOutletId)}
                  </Text>
                </View>

                <Text variant="caption">
                  {item.items.length}{" "}
                  {item.items.length === 1 ? "product" : "products"}
                  {item.notes ? ` · ${item.notes}` : ""}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}

      <Sheet
        visible={detail != null}
        onClose={() => setDetail(null)}
        title={detail ? `Transfer #${detail.id}` : ""}
        description={detail ? statusLabel(detail.status) : undefined}
      >
        {detail ? (
          <View style={styles.sheetBody}>
            <Card padded={false} style={styles.sheetCard}>
              <View style={styles.sheetRow}>
                <Text variant="label">From</Text>
                <Text variant="body">{outletName(detail.fromOutletId)}</Text>
              </View>
              <Divider />
              <View style={styles.sheetRow}>
                <Text variant="label">To</Text>
                <Text variant="body">{outletName(detail.toOutletId)}</Text>
              </View>
              <Divider />
              <View style={styles.sheetRow}>
                <Text variant="label">Created</Text>
                <Text variant="body">{formatDateTime(detail.createdAt)}</Text>
              </View>
              {detail.completedAt ? (
                <>
                  <Divider />
                  <View style={styles.sheetRow}>
                    <Text variant="label">Completed</Text>
                    <Text variant="body">
                      {formatDateTime(detail.completedAt)}
                    </Text>
                  </View>
                </>
              ) : null}
              {detail.notes ? (
                <>
                  <Divider />
                  <View style={styles.sheetRow}>
                    <Text variant="label">Notes</Text>
                    <Text variant="body" style={styles.sheetValue}>
                      {detail.notes}
                    </Text>
                  </View>
                </>
              ) : null}
            </Card>

            <Text variant="label">Lines</Text>
            <Card padded={false} style={styles.sheetCard}>
              {detail.items.map((item, index) => (
                <View key={item.id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={styles.sheetRow}>
                    <Text variant="body" numberOfLines={1} style={styles.sheetValue}>
                      {item.productName}
                    </Text>
                    <Text variant="bodySmall" color={colors.inkSecondary}>
                      × {formatQuantity(item.quantity)}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>

            {error ? (
              <Text variant="caption" color={colors.danger}>
                {error}
              </Text>
            ) : null}

            {OPEN_STATUSES.includes(detail.status) ? (
              canAdjust ? (
                <Button
                  label="Complete transfer"
                  onPress={() => setConfirming(true)}
                  loading={completeMutation.isPending}
                  disabled={completeMutation.isPending}
                  fullWidth
                />
              ) : (
                <Text variant="caption">
                  Completing a transfer needs inventory.adjust.
                </Text>
              )
            ) : (
              <Text variant="caption">
                This transfer is {statusLabel(detail.status).toLowerCase()} and
                can no longer move stock.
              </Text>
            )}
          </View>
        ) : null}
      </Sheet>

      <ConfirmDialog
        visible={confirming}
        title="Move this stock?"
        message={
          detail
            ? `${detail.items.length} lines leave ${outletName(detail.fromOutletId)} and arrive at ${outletName(detail.toOutletId)}. This posts stock movements and cannot be undone.`
            : ""
        }
        confirmLabel="Complete transfer"
        cancelLabel="Not yet"
        loading={completeMutation.isPending}
        onConfirm={() => (detail ? void complete(detail) : undefined)}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingBottom: 12 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  row: { gap: 8 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  route: { flexDirection: "row", alignItems: "center", gap: 8 },
  routeText: { flexShrink: 1 },
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  skeletonWrap: { paddingHorizontal: 16, gap: 10 },
  sheetBody: { gap: 12, paddingBottom: 8 },
  sheetCard: { paddingVertical: 4, paddingHorizontal: 4 },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  sheetValue: { flex: 1 },
});
