import { StyleSheet, View } from "react-native";
import { BarChart3, Package } from "lucide-react-native";
import { formatMoney } from "@/lib/format";
import { useTheme } from "@/theme";
import { useAuth } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import {
  fetchSalesSummary,
  fetchSalesByProduct,
  fetchLowStock,
} from "@/api/endpoints/reports";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/layout/app-header";
import { Screen, ScreenScroll } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { has } = useAuth();
  const { business, outlet } = useTenant();
  const currency = business?.currency ?? "USD";

  const summaryQuery = useQuery({
    queryKey: ["reports", "summary", business?.id, outlet?.id],
    queryFn: () => fetchSalesSummary({ outletId: outlet?.id ?? null }),
    enabled: Boolean(business?.id) && has("reports.view"),
  });

  const byProductQuery = useQuery({
    queryKey: ["reports", "by-product", business?.id, outlet?.id],
    queryFn: () => fetchSalesByProduct({ outletId: outlet?.id ?? null }),
    enabled: Boolean(business?.id) && has("reports.view"),
  });

  const lowStockQuery = useQuery({
    queryKey: ["reports", "low-stock", business?.id, outlet?.id],
    queryFn: () => fetchLowStock({ outletId: outlet?.id ?? null }),
    enabled: Boolean(business?.id) && has("inventory.view"),
  });

  if (!has("reports.view")) {
    return (
      <Screen>
        <AppHeader title="Reports" subtitle="Sales and stock" showAvatar />
        <View style={styles.stateWrap}>
          <ErrorState forbidden title="Reports not enabled for your role" message="A manager can grant reports view." />
        </View>
      </Screen>
    );
  }

  const summary = summaryQuery.data;
  const rows = byProductQuery.data ?? [];
  const lowStock = lowStockQuery.data ?? [];

  return (
    <Screen>
      <AppHeader title="Reports" subtitle="Sales and stock" showAvatar />

      <ScreenScroll bottomPadding={32} contentStyle={styles.content}>
        {summaryQuery.isLoading ? (
          <Skeleton height={120} radius={12} />
        ) : summaryQuery.isError ? (
          <ErrorState message={summaryQuery.error instanceof Error ? summaryQuery.error.message : "Could not load summary."} onRetry={() => void summaryQuery.refetch()} />
        ) : summary ? (
          <Card style={styles.card}>
            <Text variant="title">Sales summary</Text>
            <View style={styles.row}>
              <Text variant="bodySmall">Transactions</Text>
              <Text variant="bodySmall" color={colors.ink}>{summary.count}</Text>
            </View>
            <View style={styles.row}>
              <Text variant="bodySmall">Gross sales</Text>
              <Text variant="bodySmall" color={colors.ink}>{formatMoney(summary.grossSales, currency)}</Text>
            </View>
            <View style={styles.row}>
              <Text variant="bodySmall">Discounts</Text>
              <Text variant="bodySmall" color={colors.ink}>− {formatMoney(summary.discounts, currency)}</Text>
            </View>
            <View style={styles.row}>
              <Text variant="bodySmall">Tax</Text>
              <Text variant="bodySmall" color={colors.ink}>{formatMoney(summary.tax, currency)}</Text>
            </View>
            <View style={styles.row}>
              <Text variant="title">Net sales</Text>
              <Text variant="title" color={colors.ink}>{formatMoney(summary.netSales, currency)}</Text>
            </View>
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Text variant="title">Sales by product</Text>
          {byProductQuery.isLoading ? (
            <Skeleton height={60} radius={8} />
          ) : rows.length === 0 ? (
            <EmptyState icon={BarChart3} title="No product sales" description="Sales will appear here once transactions are recorded." />
          ) : (
            <View style={styles.list}>
              {rows.map((row) => (
                <View key={row.productId} style={styles.row}>
                  <Text variant="bodySmall" color={colors.ink} numberOfLines={1} style={styles.name}>
                    {row.productName}
                  </Text>
                  <Text variant="caption">{row.quantity} sold</Text>
                  <Text variant="bodySmall" color={colors.ink}>{formatMoney(row.total, currency)}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {has("inventory.view") ? (
          <Card style={styles.card}>
            <Text variant="title">Low stock</Text>
            {lowStockQuery.isLoading ? (
              <Skeleton height={60} radius={8} />
            ) : lowStock.length === 0 ? (
              <EmptyState icon={Package} title="No low-stock items" description="Stock levels look healthy." />
            ) : (
              <View style={styles.list}>
                {lowStock.map((item) => (
                  <View key={item.id} style={styles.row}>
                    <Text variant="bodySmall" color={colors.ink} numberOfLines={1} style={styles.name}>
                      {item.productName}
                    </Text>
                    <Badge label={item.quantity} tone="warning" />
                  </View>
                ))}
              </View>
            )}
          </Card>
        ) : null}
      </ScreenScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16, paddingBottom: 32 },
  card: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { flex: 1 },
  list: { gap: 6 },
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
});