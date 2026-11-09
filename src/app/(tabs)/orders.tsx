import { useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { ClipboardList, Plus } from "lucide-react-native";
import { formatDateTime, formatMoney, formatQuantity } from "@/lib/format";
import { useTheme } from "@/theme";
import { useAuth } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { useOrders } from "@/features/orders/use-orders";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/ui/screen";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

export default function OrdersScreen() {
  const { colors } = useTheme();
  const { has } = useAuth();
  const { business } = useTenant();
  const currency = business?.currency ?? "USD";

  const [status, setStatus] = useState<"active" | "all">("active");
  const ordersQuery = useOrders(status);
  const orders = ordersQuery.data ?? [];

  const canCreate = has("orders.create");

  if (!has("orders.view")) {
    return (
      <Screen>
        <AppHeader title="Orders" subtitle="Open tabs" showAvatar />
        <View style={styles.stateWrap}>
          <ErrorState
            forbidden
            title="Orders are not enabled for your role"
            message="A manager can grant you the orders view permission in the Velora web app."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        title="Orders"
        subtitle={
          orders.length > 0
            ? `${orders.length} ${status === "active" ? "open" : "total"}`
            : "Open tabs and kitchen flow"
        }
        showAvatar
        right={
          canCreate ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New order"
              hitSlop={4}
              onPress={() => router.push("/order/new")}
              style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Plus size={18} color={colors.primaryForeground} />
            </Pressable>
          ) : undefined
        }
      />

      <View style={styles.filters}>
        {(["active", "all"] as const).map((value) => {
          const active = status === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setStatus(value)}
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
                {value === "active" ? "Open" : "All"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {ordersQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={96} radius={12} />
          ))}
        </View>
      ) : ordersQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            message={
              ordersQuery.error instanceof Error
                ? ordersQuery.error.message
                : "Could not load orders."
            }
            onRetry={() => void ordersQuery.refetch()}
          />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState
            icon={ClipboardList}
            title={status === "active" ? "No open orders" : "No orders yet"}
            description={
              status === "active"
                ? "Open a tab from the Sell screen to start a kitchen order."
                : "Orders you create will appear here."
            }
          />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={ordersQuery.isRefetching && !ordersQuery.isLoading}
              onRefresh={() => void ordersQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Order ${item.orderNumber}`}
              onPress={() => router.push({ pathname: "/order/[id]", params: { id: item.id } })}
            >
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <Text variant="title" numberOfLines={1}>
                      {item.orderNumber}
                    </Text>
                    <Text variant="caption">
                      {item.orderType.replace("_", " ")} · {formatQuantity(
                        item.items.reduce((sum, line) => sum + Number(line.quantity), 0),
                      )}{" "}
                      items
                    </Text>
                  </View>
                  <Badge
                    label={item.orderStatus || item.status}
                    tone={
                      item.orderStatus === "ready"
                        ? "success"
                        : item.orderStatus === "in_kitchen"
                          ? "warning"
                          : "neutral"
                    }
                  />
                </View>
                <View style={styles.meta}>
                  <Text variant="caption">{formatDateTime(item.createdAt)}</Text>
                  <Text variant="bodySmall" color={colors.ink}>
                    {formatMoney(item.total, currency)}
                  </Text>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  list: {
    padding: 16,
    gap: 10,
    paddingBottom: 32,
  },
  card: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stateWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  skeletonWrap: {
    padding: 16,
    gap: 10,
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5B3FD6",
  },
});