import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Tag } from "lucide-react-native";
import { useTheme } from "@/theme";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import {
  usePromotions,
  useSetPromotionActiveMutation,
} from "@/features/promotions/use-promotions";
import { formatDate, formatMoney } from "@/lib/format";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Screen } from "@/components/ui/screen";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import type { Promotion } from "@/api/types";

type PromotionState = "live" | "scheduled" | "ended" | "paused";

const FILTERS = [
  { key: null, label: "All" },
  { key: "live", label: "Live" },
  { key: "scheduled", label: "Scheduled" },
  { key: "ended", label: "Ended" },
  { key: "paused", label: "Paused" },
] as const;

function promotionState(promotion: Promotion, now: number): PromotionState {
  const starts = promotion.startsAt ? new Date(promotion.startsAt).getTime() : 0;
  const ends = promotion.endsAt ? new Date(promotion.endsAt).getTime() : 0;

  // Paused beats scheduled: an inactive promotion will not go live when its
  // window opens, so the badge and the pause filter must not call it scheduled.
  if (ends && ends < now) return "ended";
  if (!promotion.active) return "paused";
  if (starts && starts > now) return "scheduled";
  return "live";
}

function stateLabel(state: PromotionState) {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

function stateTone(state: PromotionState): BadgeTone {
  if (state === "live") return "success";
  if (state === "scheduled") return "info";
  if (state === "ended") return "neutral";
  return "warning";
}

function discountLabel(promotion: Promotion, currency: string) {
  if (promotion.type === "fixed") {
    return `${formatMoney(promotion.value, currency)} off`;
  }
  return `${Number(promotion.value)}% off`;
}

function PromotionCard({
  promotion,
  state,
  currency,
  onPress,
}: {
  promotion: Promotion;
  state: PromotionState;
  currency: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${promotion.name}`}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <Card style={styles.row}>
        <View style={styles.rowTop}>
          <Text variant="body" numberOfLines={1} style={styles.rowName}>
            {promotion.name}
          </Text>
          <Badge label={stateLabel(state)} tone={stateTone(state)} />
        </View>

        <View style={styles.rowMiddle}>
          <Text variant="title">{discountLabel(promotion, currency)}</Text>
          {promotion.code ? <Badge label={promotion.code} tone="primary" /> : null}
        </View>

        <Text variant="caption" numberOfLines={1} color={colors.inkSecondary}>
          {[
            promotion.minSpend
              ? `Min ${formatMoney(promotion.minSpend, currency)}`
              : null,
            promotion.usageLimit
              ? `${promotion.usageCount}/${promotion.usageLimit} used`
              : `${promotion.usageCount} used`,
            promotion.perCustomerLimit
              ? `${promotion.perCustomerLimit} per customer`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </Card>
    </Pressable>
  );
}

export default function PromotionsScreen() {
  const { colors } = useTheme();
  const { has } = usePermissions();
  const { business } = useTenant();
  const promotionsQuery = usePromotions();
  const toggleMutation = useSetPromotionActiveMutation();

  const [filter, setFilter] = useState<PromotionState | null>(null);
  const [detail, setDetail] = useState<Promotion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currency = business?.currency ?? "USD";

  // Statuses are time-dependent (scheduled → live → ended), so the clock is
  // state that a timer advances rather than something read during render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const promotions = useMemo(() => {
    const rows = promotionsQuery.data ?? [];
    return [...rows].sort((a, b) => {
      const rank: Record<PromotionState, number> = {
        live: 0,
        scheduled: 1,
        paused: 2,
        ended: 3,
      };
      return rank[promotionState(a, now)] - rank[promotionState(b, now)];
    });
  }, [promotionsQuery.data, now]);

  const visible = filter
    ? promotions.filter((promotion) => promotionState(promotion, now) === filter)
    : promotions;

  if (!has("promotions.view")) {
    return (
      <Screen>
        <AppHeader title="Promotions" subtitle="Discounts" showBack />
        <View style={styles.stateWrap}>
          <ErrorState
            forbidden
            title="Promotions not enabled for your role"
            message="A manager can grant promotions view."
          />
        </View>
      </Screen>
    );
  }

  const canManage = has("promotions.manage");

  const toggleDetail = async (promotion: Promotion) => {
    setError(null);
    try {
      const next = await toggleMutation.mutateAsync({
        promotion,
        active: !promotion.active,
      });
      setDetail(next);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update the promotion.",
      );
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Promotions"
        subtitle={`${promotions.length} ${promotions.length === 1 ? "promotion" : "promotions"}`}
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
                key={option.label}
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

      {promotionsQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} height={92} radius={12} />
          ))}
        </View>
      ) : promotionsQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            message={
              promotionsQuery.error instanceof Error
                ? promotionsQuery.error.message
                : "Could not load promotions."
            }
            onRetry={() => void promotionsQuery.refetch()}
          />
        </View>
      ) : visible.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState
            icon={Tag}
            title={filter ? `No ${filter} promotions` : "No promotions yet"}
            description={
              filter
                ? "Clear the filter to see the rest of the list."
                : "Discount codes and automatic offers created on the web app appear here."
            }
            actionLabel={filter ? "Clear filter" : undefined}
            onAction={filter ? () => setFilter(null) : undefined}
          />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(promotion) => promotion.id}
          renderItem={({ item }) => (
            <PromotionCard
              promotion={item}
              state={promotionState(item, now)}
              currency={currency}
              onPress={() => {
                setError(null);
                setDetail(item);
              }}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={promotionsQuery.isRefetching && !promotionsQuery.isLoading}
              onRefresh={() => void promotionsQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
        />
      )}

      <Sheet
        visible={detail != null}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ""}
        description={detail ? discountLabel(detail, currency) : undefined}
      >
        {detail ? (
          <View style={styles.detail}>
            <View style={styles.detailRow}>
              <Text variant="label">Status</Text>
              <Text variant="body">
                {stateLabel(promotionState(detail, now))}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="label">Code</Text>
              <Text variant="body">{detail.code || "Automatic (no code)"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="label">Runs</Text>
              <Text variant="body">
                {detail.startsAt ? formatDate(detail.startsAt) : "Anytime"}
                {" → "}
                {detail.endsAt ? formatDate(detail.endsAt) : "No end date"}
              </Text>
            </View>
            {detail.description ? (
              <Text variant="bodySmall" color={colors.inkSecondary}>
                {detail.description}
              </Text>
            ) : null}

            {error ? (
              <Text variant="caption" color={colors.danger}>
                {error}
              </Text>
            ) : null}

            {canManage ? (
              <Button
                label={
                  toggleMutation.isPending
                    ? "Saving…"
                    : detail.active
                      ? "Pause promotion"
                      : "Resume promotion"
                }
                variant={detail.active ? "secondary" : "primary"}
                onPress={() => void toggleDetail(detail)}
                loading={toggleMutation.isPending}
                disabled={toggleMutation.isPending}
                fullWidth
              />
            ) : (
              <Text variant="caption">
                Changing a promotion needs promotions.manage.
              </Text>
            )}
          </View>
        ) : null}
      </Sheet>
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
  rowName: { flex: 1 },
  rowMiddle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  skeletonWrap: { paddingHorizontal: 16, gap: 10 },
  detail: { gap: 12, paddingBottom: 8 },
  detailRow: { gap: 2 },
});
