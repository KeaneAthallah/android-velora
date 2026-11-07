import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Percent,
  Receipt,
  Scale,
  Wallet,
} from "lucide-react-native";
import { useTheme } from "@/theme";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { AppHeader } from "@/components/layout/app-header";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Screen, ScreenScroll } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Text } from "@/components/ui/text";
import { errorMessage } from "@/api/client";
import { fetchAging, fetchFinancialSummary, type AgingBuckets } from "@/api/endpoints/finance";
import { formatMoney } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

type PeriodKey = "this_month" | "last_month" | "last_30";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "last_30", label: "Last 30 days" },
];

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function periodRange(period: PeriodKey): { from: string; to: string } {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (period === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: isoDate(start), to: isoDate(end) };
  }

  if (period === "last_30") {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    return { from: isoDate(start), to: isoDate(now) };
  }

  return { from: isoDate(startOfMonth), to: isoDate(now) };
}

const AGING_ROWS: { key: keyof AgingBuckets; label: string }[] = [
  { key: "current", label: "Current" },
  { key: "days1To30", label: "1–30 days" },
  { key: "days31To60", label: "31–60 days" },
  { key: "days61To90", label: "61–90 days" },
  { key: "over90", label: "Over 90 days" },
];

function AgingCard({
  title,
  buckets,
  currency,
}: {
  title: string;
  buckets: AgingBuckets | undefined;
  currency: string;
}) {
  const { colors } = useTheme();

  return (
    <Card style={{ gap: 8 }}>
      <View style={styles.cardHead}>
        <Text variant="title">{title}</Text>
        <Text variant="bodySmall" color={colors.inkMuted}>
          {formatMoney(buckets?.total ?? 0, currency)}
        </Text>
      </View>

      {(buckets ? AGING_ROWS : []).map((row) => (
        <View key={row.key} style={styles.line}>
          <Text variant="bodySmall" color={colors.inkMuted}>
            {row.label}
          </Text>
          <Text variant="bodySmall">{formatMoney(buckets?.[row.key] ?? 0, currency)}</Text>
        </View>
      ))}
    </Card>
  );
}

export default function FinanceScreen() {
  const { colors, radii } = useTheme();
  const { has } = usePermissions();
  const { business, businessId, outlet } = useTenant();
  const currency = business?.currency ?? "IDR";

  const [period, setPeriod] = useState<PeriodKey>("this_month");
  const range = useMemo(() => periodRange(period), [period]);

  const canView = has("analytics.view");
  const canSeeAr = has("ar.view");
  const canSeeAp = has("ap.view");

  const summaryQuery = useQuery({
    queryKey: queryKeys.financialSummary(businessId, outlet?.id ?? null, range.from, range.to),
    queryFn: () =>
      fetchFinancialSummary({ from: range.from, to: range.to, outletId: outlet?.id ?? null }),
    enabled: Boolean(businessId) && canView,
  });

  const arQuery = useQuery({
    queryKey: queryKeys.aging(businessId, "ar"),
    queryFn: () => fetchAging("ar"),
    enabled: Boolean(businessId) && canSeeAr,
  });

  const apQuery = useQuery({
    queryKey: queryKeys.aging(businessId, "ap"),
    queryFn: () => fetchAging("ap"),
    enabled: Boolean(businessId) && canSeeAp,
  });

  if (!canView) {
    return (
      <Screen>
        <AppHeader title="Finance" subtitle="Revenue, profit and balances" showBack />
        <View style={styles.stateWrap}>
          <ErrorState
            forbidden
            title="Finance is not enabled for your role"
            message="A manager can grant analytics view in the Velora web app."
          />
        </View>
      </Screen>
    );
  }

  const summary = summaryQuery.data;
  const margin =
    summary?.grossMarginPercent == null ? "—" : `${summary.grossMarginPercent.toFixed(1)}%`;

  return (
    <Screen>
      <AppHeader title="Finance" subtitle="Revenue, profit and balances" showBack />

      <ScreenScroll
        refreshing={summaryQuery.isRefetching}
        onRefresh={() => {
          void summaryQuery.refetch();
          void arQuery.refetch();
          void apQuery.refetch();
        }}
        contentStyle={styles.content}
      >
        <View style={styles.chipRow}>
          {PERIODS.map((option) => {
            const active = period === option.key;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setPeriod(option.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primarySoft : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: radii.full,
                  },
                ]}
              >
                <Text variant="caption" color={active ? colors.primary : colors.inkSecondary}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {summaryQuery.isPending ? (
          <View style={styles.grid}>
            <Skeleton height={96} />
            <Skeleton height={96} />
            <Skeleton height={96} />
            <Skeleton height={96} />
          </View>
        ) : summaryQuery.isError ? (
          <ErrorState
            title="Could not load the financial summary"
            message={errorMessage(summaryQuery.error, "Check the connection and try again.")}
            onRetry={() => void summaryQuery.refetch()}
          />
        ) : summary ? (
          <View style={{ gap: 16 }}>
            <View style={styles.grid}>
              <StatCard
                label="Revenue"
                value={formatMoney(summary.revenue, currency)}
                icon={Banknote}
                tone="primary"
              />
              <StatCard
                label="Gross profit"
                value={formatMoney(summary.grossProfit, currency)}
                hint={`Margin ${margin}`}
                icon={Percent}
                tone="success"
              />
              <StatCard
                label="Operating expenses"
                value={formatMoney(summary.operatingExpenses, currency)}
                icon={Receipt}
                tone="warning"
              />
              <StatCard
                label="Net profit"
                value={formatMoney(summary.netProfit, currency)}
                icon={Scale}
                tone={summary.netProfit >= 0 ? "success" : "danger"}
              />
            </View>

            <Card style={{ gap: 8 }}>
              <Text variant="title">Period detail</Text>

              <Row label="Cost of goods sold" value={formatMoney(summary.cogs, currency)} />
              <Row label="Other income" value={formatMoney(summary.otherIncome, currency)} />
              <Row label="Tax collected" value={formatMoney(summary.taxCollected, currency)} />
              <Row label="Refunds" value={formatMoney(summary.refunds, currency)} />
              <Row label="Cash collected" value={formatMoney(summary.cashCollected, currency)} />
            </Card>

            <View style={styles.grid}>
              <StatCard
                label="Receivable"
                value={formatMoney(summary.accountsReceivable, currency)}
                hint="Outstanding customer invoices"
                icon={ArrowDownLeft}
                tone="primary"
              />
              <StatCard
                label="Payable"
                value={formatMoney(summary.accountsPayable, currency)}
                hint="Outstanding supplier bills"
                icon={ArrowUpRight}
                tone="danger"
              />
            </View>
          </View>
        ) : null}

        {canSeeAr ? (
          arQuery.isPending ? (
            <Skeleton height={160} />
          ) : arQuery.isError ? (
            <ErrorState
              title="Could not load receivables aging"
              message={errorMessage(arQuery.error, "Check the connection and try again.")}
              onRetry={() => void arQuery.refetch()}
            />
          ) : (
            <AgingCard title="Receivables aging" buckets={arQuery.data} currency={currency} />
          )
        ) : null}

        {canSeeAp ? (
          apQuery.isPending ? (
            <Skeleton height={160} />
          ) : apQuery.isError ? (
            <ErrorState
              title="Could not load payables aging"
              message={errorMessage(apQuery.error, "Check the connection and try again.")}
              onRetry={() => void apQuery.refetch()}
            />
          ) : (
            <AgingCard title="Payables aging" buckets={apQuery.data} currency={currency} />
          )
        ) : null}

        <View style={[styles.note, { backgroundColor: colors.surfaceMuted }]}>
          <Wallet size={15} color={colors.inkMuted} />
          <Text variant="caption" style={{ flex: 1 }}>
            Journal entries, chart of accounts and invoice capture stay in the Velora web app.
          </Text>
        </View>
      </ScreenScroll>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.line}>
      <Text variant="bodySmall" color={colors.inkMuted}>
        {label}
      </Text>
      <Text variant="bodySmall">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  content: { gap: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    minHeight: 38,
    justifyContent: "center",
    borderWidth: 1,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  line: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  note: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10 },
});
