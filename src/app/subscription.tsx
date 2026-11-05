import { StyleSheet, View } from "react-native";
import { Check, CreditCard, X } from "lucide-react-native";
import { useTheme } from "@/theme";
import { useSubscriptionDetail } from "@/features/subscription/use-subscription-detail";
import { formatDate, formatMoney } from "@/lib/format";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { ErrorState } from "@/components/ui/error-state";
import { Screen, ScreenScroll } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

function statusTone(status: string, isActive: boolean): BadgeTone {
  if (status === "trialing") return "info";
  if (isActive) return "success";
  return "danger";
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
}

function featureLabel(key: string) {
  return key
    .split("_")
    .map((word) =>
      word.toLowerCase() === "pos"
        ? "POS"
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

export default function SubscriptionScreen() {
  const { colors, radii } = useTheme();
  const subscriptionQuery = useSubscriptionDetail();
  const detail = subscriptionQuery.data;

  return (
    <Screen>
      <AppHeader
        title="Subscription"
        subtitle={detail?.planName ?? "Plan and usage"}
        showBack
      />

      <ScreenScroll
        refreshing={
          subscriptionQuery.isRefetching && !subscriptionQuery.isLoading
        }
        onRefresh={() => void subscriptionQuery.refetch()}
        contentStyle={styles.content}
      >
        {subscriptionQuery.isLoading ? (
          <View style={styles.skeletonWrap}>
            <Skeleton height={120} radius={16} />
            <Skeleton height={200} radius={16} />
            <Skeleton height={140} radius={16} />
          </View>
        ) : subscriptionQuery.isError ? (
          <View style={styles.stateWrap}>
            <ErrorState
              message={
                subscriptionQuery.error instanceof Error
                  ? subscriptionQuery.error.message
                  : "Could not load the subscription."
              }
              onRetry={() => void subscriptionQuery.refetch()}
            />
          </View>
        ) : detail ? (
          <>
            <View>
              <SectionHeader title="Plan" />
              <Card style={styles.planCard}>
                <View style={styles.planTop}>
                  <View style={styles.planText}>
                    <Text variant="heading">{detail.planName ?? "No plan"}</Text>
                    {detail.planDescription ? (
                      <Text variant="caption" numberOfLines={2}>
                        {detail.planDescription}
                      </Text>
                    ) : null}
                  </View>
                  <Badge
                    label={statusLabel(detail.status)}
                    tone={statusTone(detail.status, detail.isActive)}
                  />
                </View>

                <Divider />

                <View style={styles.metaRow}>
                  <Text variant="label">Billing</Text>
                  <Text variant="body">
                    {detail.billingPeriod === "yearly" ? "Yearly" : "Monthly"}
                    {detail.priceAmount
                      ? ` · ${formatMoney(
                          detail.priceAmount,
                          detail.currency ?? "USD",
                        )}`
                      : ""}
                    {detail.priceAmount
                      ? ""
                      : detail.status === "trialing"
                        ? " · free while trialing"
                        : ""}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text variant="label">
                    {detail.status === "trialing" ? "Trial ends" : "Renews"}
                  </Text>
                  <Text variant="body">
                    {detail.status === "trialing"
                      ? `${detail.trialDaysRemaining} days left${
                          detail.trialEndsAt
                            ? ` · ${formatDate(detail.trialEndsAt)}`
                            : ""
                        }`
                      : detail.currentPeriodEnd
                        ? `${formatDate(detail.currentPeriodEnd)} · ${detail.daysRemaining} days left`
                        : "No renewal scheduled"}
                  </Text>
                </View>

                {detail.cancelAtPeriodEnd ? (
                  <Text variant="caption" color={colors.warning}>
                    Cancels at the end of the paid period.
                  </Text>
                ) : null}
              </Card>
            </View>

            <View>
              <SectionHeader title="Usage" />
              <Card style={styles.usageCard}>
                {detail.usage.map((metric, index) => (
                  <View key={metric.metric}>
                    {index > 0 ? <Divider /> : null}
                    <View style={styles.meter}>
                      <View style={styles.meterTop}>
                        <Text variant="bodySmall">{metric.label}</Text>
                        <Text
                          variant="caption"
                          color={
                            !metric.unlimited && metric.percent >= 90
                              ? colors.danger
                              : colors.inkSecondary
                          }
                        >
                          {metric.used}
                          {metric.unlimited ? " · unlimited" : ` / ${metric.limit}`}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.track,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderRadius: radii.full,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.fill,
                            {
                              width: `${metric.unlimited ? 8 : metric.percent}%`,
                              backgroundColor:
                                metric.percent >= 90
                                  ? colors.danger
                                  : metric.percent >= 80
                                    ? colors.warning
                                    : colors.primary,
                              borderRadius: radii.full,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                ))}

                {detail.usage.length === 0 ? (
                  <Text variant="caption">
                    This plan has no metered limits.
                  </Text>
                ) : null}
              </Card>
            </View>

            <View>
              <SectionHeader title="Included" />
              <Card style={styles.featureCard}>
                {detail.features.length === 0 ? (
                  <Text variant="caption">No feature flags on this plan.</Text>
                ) : (
                  detail.features.map((feature, index) => (
                    <View key={feature.key}>
                      {index > 0 ? <Divider /> : null}
                      <View style={styles.featureRow}>
                        {feature.enabled ? (
                          <Check size={15} color={colors.success} />
                        ) : (
                          <X size={15} color={colors.inkMuted} />
                        )}
                        <Text
                          variant="bodySmall"
                          color={
                            feature.enabled ? undefined : colors.inkSecondary
                          }
                          style={styles.featureText}
                        >
                          {featureLabel(feature.key)}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </Card>
            </View>

            <View style={[styles.note, { backgroundColor: colors.surfaceMuted }]}>
              <CreditCard size={15} color={colors.inkMuted} />
              <Text variant="caption" style={styles.noteText}>
                Changing plan, renewing, invoices and payment methods stay in the
                Velora web app so card details never touch the register.
              </Text>
            </View>
          </>
        ) : null}
      </ScreenScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20, paddingTop: 4 },
  skeletonWrap: { gap: 12 },
  stateWrap: { flex: 1, justifyContent: "center" },
  planCard: { gap: 12 },
  planTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  planText: { flex: 1, gap: 2 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  usageCard: { gap: 4 },
  meter: { gap: 6, paddingVertical: 8 },
  meterTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  track: { height: 6, overflow: "hidden" },
  fill: { height: 6 },
  featureCard: { paddingVertical: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  featureText: { flex: 1 },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  noteText: { flex: 1 },
});
