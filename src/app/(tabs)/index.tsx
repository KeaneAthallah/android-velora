import type { ComponentProps } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import {
  ClipboardList,
  Info,
  Package,
  PackageSearch,
  ReceiptText,
  Settings,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react-native";
import { useTheme } from "@/theme";
import { useAuth } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { useDashboardData } from "@/features/dashboard/use-dashboard";
import { DashboardHeader } from "@/features/dashboard/dashboard-header";
import { formatCount, formatDateTime, formatMoney, formatQuantity } from "@/lib/format";
import { ScreenScroll } from "@/components/ui/screen";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ListRow } from "@/components/ui/list-row";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

type Shortcut = {
  key: string;
  label: string;
  icon: ComponentProps<typeof StatCard>["icon"];
  onPress: () => void;
};

function statusTone(status: string): BadgeTone {
  switch (status) {
    case "completed":
    case "paid":
      return "success";
    case "voided":
    case "failed":
      return "danger";
    case "refunded":
    case "partially_refunded":
      return "warning";
    default:
      return "neutral";
  }
}

function SkeletonRows() {
  return (
    <Card style={styles.skeletonCard}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <Skeleton width={34} height={34} radius={8} />
          <View style={styles.skeletonText}>
            <Skeleton width="55%" height={13} />
            <Skeleton width="35%" height={11} />
          </View>
          <Skeleton width={64} height={13} />
        </View>
      ))}
    </Card>
  );
}

export default function DashboardScreen() {
  const { colors, fonts } = useTheme();
  const { has } = useAuth();
  const { business, outlet, outlets } = useTenant();
  const {
    summary,
    lowStock,
    recentSales,
    productCount,
    refreshing,
    refresh,
    can,
  } = useDashboardData();

  const currency = business?.currency ?? "USD";
  const averageSale =
    summary.data && summary.data.count > 0
      ? String(Number(summary.data.netSales) / summary.data.count)
      : null;

  const shortcuts: Shortcut[] = [];
  if (has(["sales.create", "sales.view"])) {
    shortcuts.push({
      key: "sell",
      label: "New sale",
      icon: ReceiptText,
      onPress: () => router.navigate("/sales"),
    });
  }
  if (can.products) {
    shortcuts.push({
      key: "catalogue",
      label: "Catalogue",
      icon: Package,
      onPress: () => router.navigate("/products"),
    });
  }
  if (has("orders.view")) {
    shortcuts.push({
      key: "orders",
      label: "Orders",
      icon: ClipboardList,
      onPress: () => router.navigate("/orders"),
    });
  }
  shortcuts.push({
    key: "settings",
    label: "Settings",
    icon: Settings,
    onPress: () => router.push("/settings"),
  });

  const restricted = !can.reports && !can.sales && !can.inventory && !can.products;

  return (
    <ScreenScroll
      onRefresh={() => void refresh()}
      refreshing={refreshing}
      bottomPadding={28}
      contentStyle={styles.content}
    >
      <DashboardHeader />

      <View style={styles.statGrid}>
        {can.reports ? (
          <>
            <StatCard
              label="Net sales"
              value={formatMoney(summary.data?.netSales, currency)}
              hint="Today at this outlet"
              icon={Wallet}
              tone="primary"
              loading={summary.isLoading}
            />
            <StatCard
              label="Transactions"
              value={summary.data ? formatCount(summary.data.count) : "—"}
              hint="Completed today"
              icon={ReceiptText}
              loading={summary.isLoading}
            />
            <StatCard
              label="Collected"
              value={formatMoney(summary.data?.paid, currency)}
              hint="Payments received"
              icon={TrendingUp}
              tone="success"
              loading={summary.isLoading}
            />
            {can.inventory ? (
              <StatCard
                label="Low stock"
                value={lowStock.data ? formatCount(lowStock.data.length) : "—"}
                hint="At or below 5 units"
                icon={PackageSearch}
                tone={lowStock.data && lowStock.data.length > 0 ? "warning" : "default"}
                loading={lowStock.isLoading}
              />
            ) : (
              <StatCard
                label="Average sale"
                value={formatMoney(averageSale, currency)}
                hint="Net ÷ transactions"
                icon={TrendingUp}
                loading={summary.isLoading}
              />
            )}
          </>
        ) : (
          <>
            <StatCard
              label="Outlets"
              value={formatCount(outlets.length)}
              hint={outlet?.name ?? "Workspace"}
              icon={Store}
            />
            {can.products ? (
              <StatCard
                label="Products"
                value={productCount.data != null ? formatCount(productCount.data) : "—"}
                hint="In the catalogue"
                icon={Package}
                loading={productCount.isLoading}
              />
            ) : null}
          </>
        )}
      </View>

      {can.reports && summary.isError ? (
        <ErrorState
          compact
          message={
            summary.error instanceof Error
              ? summary.error.message
              : "Could not load today's sales."
          }
          onRetry={() => void summary.refetch()}
        />
      ) : null}

      {restricted ? (
        <Card style={styles.notice}>
          <View style={styles.noticeRow}>
            <Info size={18} color={colors.info} />
            <Text variant="bodySmall" style={styles.noticeText}>
              Your role has limited access on this device. Ask an owner or admin
              to review your permissions in the Velora web app.
            </Text>
          </View>
        </Card>
      ) : null}

      {shortcuts.length > 0 ? (
        <View>
          <SectionHeader title="Shortcuts" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.shortcuts}
          >
            {shortcuts.map((shortcut) => {
              const Icon = shortcut.icon ?? Info;
              return (
                <Pressable
                  key={shortcut.key}
                  accessibilityRole="button"
                  accessibilityLabel={shortcut.label}
                  onPress={shortcut.onPress}
                  style={({ pressed }) => (pressed ? styles.pressed : undefined)}
                >
                  <Card style={styles.shortcutCard}>
                    <View
                      style={[styles.shortcutIcon, { backgroundColor: colors.primarySoft }]}
                    >
                      <Icon size={19} color={colors.primary} />
                    </View>
                    <Text variant="bodySmall" numberOfLines={1} style={styles.shortcutLabel}>
                      {shortcut.label}
                    </Text>
                  </Card>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {can.sales ? (
        <View>
          <SectionHeader title="Recent transactions" />
          {recentSales.isLoading ? (
            <SkeletonRows />
          ) : recentSales.isError ? (
            <ErrorState
              compact
              message={
                recentSales.error instanceof Error
                  ? recentSales.error.message
                  : "Could not load recent sales."
              }
              onRetry={() => void recentSales.refetch()}
            />
          ) : recentSales.data && recentSales.data.length > 0 ? (
            <Card style={styles.listCard}>
              {recentSales.data.map((sale, index) => (
                <View
                  key={sale.id}
                  style={
                    index > 0
                      ? [styles.listDivider, { borderTopColor: colors.border }]
                      : undefined
                  }
                >
                  <ListRow
                    icon={ReceiptText}
                    title={`#${sale.receiptNumber}`}
                    subtitle={`${formatDateTime(sale.createdAt)} · ${sale.orderType}`}
                    right={
                      <View style={styles.saleRight}>
                        <Text style={{ fontFamily: fonts.semibold, color: colors.ink }}>
                          {formatMoney(sale.total, currency)}
                        </Text>
                        <Badge label={sale.status} tone={statusTone(sale.status)} />
                      </View>
                    }
                  />
                </View>
              ))}
            </Card>
          ) : (
            <Card>
              <EmptyState
                compact
                icon={ReceiptText}
                title="No transactions yet"
                description="Completed sales for today will appear here."
              />
            </Card>
          )}
        </View>
      ) : null}

      {can.inventory ? (
        <View>
          <SectionHeader title="Low stock" />
          {lowStock.isLoading ? (
            <SkeletonRows />
          ) : lowStock.isError ? (
            <ErrorState
              compact
              message={
                lowStock.error instanceof Error
                  ? lowStock.error.message
                  : "Could not load stock alerts."
              }
              onRetry={() => void lowStock.refetch()}
            />
          ) : lowStock.data && lowStock.data.length > 0 ? (
            <Card style={styles.listCard}>
              {lowStock.data.map((item, index) => (
                <View
                  key={item.id}
                  style={
                    index > 0
                      ? [styles.listDivider, { borderTopColor: colors.border }]
                      : undefined
                  }
                >
                  <ListRow
                    icon={Package}
                    title={item.productName}
                    subtitle={`${item.productSku} · ${formatQuantity(item.quantity)} ${item.productUnit}`}
                    right={
                      <Badge
                        label={`${formatQuantity(item.quantity)} left`}
                        tone="warning"
                      />
                    }
                    onPress={() =>
                      router.push({
                        pathname: "/products/[id]",
                        params: { id: item.productId },
                      })
                    }
                  />
                </View>
              ))}
            </Card>
          ) : (
            <Card>
              <EmptyState
                compact
                icon={PackageSearch}
                title="Stock looks healthy"
                description="No products at or below the five-unit threshold."
              />
            </Card>
          )}
        </View>
      ) : null}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  notice: {
    paddingVertical: 14,
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  noticeText: {
    flex: 1,
  },
  shortcuts: {
    gap: 10,
    paddingRight: 4,
  },
  shortcutCard: {
    width: 98,
    alignItems: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 8,
  },
  shortcutIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutLabel: {
    textAlign: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  listCard: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  listDivider: {
    borderTopWidth: 1,
  },
  saleRight: {
    alignItems: "flex-end",
    gap: 3,
  },
  skeletonCard: {
    gap: 14,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  skeletonText: {
    flex: 1,
    gap: 6,
  },
});
