import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { ReceiptText } from "lucide-react-native";
import { useTheme } from "@/theme";
import { useTenant } from "@/providers/tenant-provider";
import { useSalesLedger } from "@/features/transactions/use-transactions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateTime, formatMoney } from "@/lib/format";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import type { Sale } from "@/api/types";

const STATUS_FILTERS = [
  { key: null, label: "All" },
  { key: "completed", label: "Completed" },
  { key: "voided", label: "Voided" },
] as const;

function statusTone(status: string) {
  if (status === "voided") return "danger" as const;
  if (status === "refunded") return "warning" as const;
  if (status === "completed") return "success" as const;
  return "neutral" as const;
}

function orderTypeLabel(orderType: string) {
  if (orderType === "dine_in") return "Dine in";
  if (orderType === "takeaway") return "Takeaway";
  if (orderType === "delivery") return "Delivery";
  return orderType.replace(/_/g, " ");
}

function SaleRow({ sale, currency }: { sale: Sale; currency: string }) {
  const { colors } = useTheme();
  const itemCount = sale.items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open receipt ${sale.receiptNumber}`}
      onPress={() => router.push(`/receipt/${sale.id}`)}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <Card style={styles.row}>
        <View style={styles.rowTop}>
          <View style={styles.rowText}>
            <Text variant="body" numberOfLines={1}>
              {sale.receiptNumber}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {formatDateTime(sale.createdAt)} · {orderTypeLabel(sale.orderType)}
            </Text>
          </View>
          <Badge label={sale.status} tone={statusTone(sale.status)} />
        </View>

        <View style={styles.rowBottom}>
          <Text variant="bodySmall" color={colors.inkSecondary}>
            {itemCount} {itemCount === 1 ? "item" : "items"} ·{" "}
            {sale.payments.map((payment) => payment.method).join(", ") || "unpaid"}
          </Text>
          <Text variant="title">{formatMoney(sale.total, currency)}</Text>
        </View>

        {sale.voidReason ? (
          <Text variant="caption" color={colors.danger} numberOfLines={2}>
            Voided: {sale.voidReason}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

function SkeletonList() {
  return (
    <View style={styles.list}>
      {[0, 1, 2, 3, 4].map((key) => (
        <Card key={key} style={styles.row}>
          <Skeleton width="55%" height={13} />
          <Skeleton width="35%" height={10} />
          <Skeleton width="70%" height={15} />
        </Card>
      ))}
    </View>
  );
}

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const { business } = useTenant();

  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const search = useDebouncedValue(searchInput.trim(), 300);
  const salesQuery = useSalesLedger({ search, status });

  const currency = business?.currency ?? "USD";

  const sales = useMemo(
    () => salesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [salesQuery.data],
  );

  const total = salesQuery.data?.pages[0]?.total ?? 0;
  const filtered = search.length > 0 || status != null;

  const clearFilters = () => {
    setSearchInput("");
    setStatus(null);
  };

  return (
    <Screen>
      <AppHeader
        title="Transactions"
        subtitle={`${total} ${total === 1 ? "sale" : "sales"}`}
        showBack
      />

      <View style={styles.controls}>
        <SearchField
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search receipt or order number"
          accessibilityLabel="Search transactions"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chips}
        >
          {STATUS_FILTERS.map((filter) => {
            const active = status === filter.key;
            return (
              <Pressable
                key={filter.label}
                accessibilityRole="button"
                accessibilityLabel={filter.label}
                accessibilityState={{ selected: active }}
                onPress={() => setStatus(filter.key)}
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
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {salesQuery.isLoading ? (
        <SkeletonList />
      ) : salesQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            message={
              salesQuery.error instanceof Error
                ? salesQuery.error.message
                : "Could not load transactions."
            }
            onRetry={() => void salesQuery.refetch()}
          />
        </View>
      ) : sales.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState
            icon={ReceiptText}
            title={filtered ? "No matching sales" : "No sales yet"}
            description={
              filtered
                ? "Try another search or status."
                : "Completed checkouts appear here with their receipt and totals."
            }
            actionLabel={filtered ? "Clear filters" : undefined}
            onAction={filtered ? clearFilters : undefined}
          />
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(sale) => sale.id}
          renderItem={({ item }) => <SaleRow sale={item} currency={currency} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.35}
          onEndReached={() => {
            if (salesQuery.hasNextPage && !salesQuery.isFetchingNextPage) {
              void salesQuery.fetchNextPage();
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={
                salesQuery.isRefetching && !salesQuery.isFetchingNextPage
              }
              onRefresh={() => void salesQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          ListFooterComponent={
            salesQuery.isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text variant="caption">Loading more sales…</Text>
              </View>
            ) : (
              <View style={styles.footerSpace} />
            )
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  chips: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 10,
  },
  row: {
    gap: 8,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  stateWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
  },
  footerSpace: {
    height: 12,
  },
});
