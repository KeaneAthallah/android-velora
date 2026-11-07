import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Store } from "lucide-react-native";
import { useTheme } from "@/theme";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Screen, ScreenScroll } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { errorMessage } from "@/api/client";
import {
  fetchStorefrontOrders,
  fetchStorefronts,
  markStorefrontOrderPaid,
  updateStorefrontOrderStatus,
  type StorefrontOrder,
  type StorefrontOrderStatus,
} from "@/api/endpoints/storefronts";
import { formatDateTime, formatMoney } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

/** The next status for an order, respecting delivery vs pickup. */
function nextStatus(order: StorefrontOrder): StorefrontOrderStatus | null {
  const delivery = order.fulfilmentType === "delivery";

  switch (order.status) {
    case "pending":
      return "confirmed";
    case "confirmed":
      return "preparing";
    case "preparing":
      return "ready";
    case "ready":
      return delivery ? "out_for_delivery" : "completed";
    case "out_for_delivery":
      return "delivered";
    case "delivered":
      return "completed";
    default:
      return null;
  }
}

function tone(status: StorefrontOrderStatus): BadgeTone {
  if (status === "completed" || status === "delivered") return "success";
  if (status === "cancelled" || status === "failed") return "danger";
  if (status === "preparing" || status === "ready" || status === "out_for_delivery") {
    return "info";
  }
  return "warning";
}

function label(value: string): string {
  return value.replace(/_/g, " ");
}

export default function StorefrontOrdersScreen() {
  const { colors, radii } = useTheme();
  const { has } = usePermissions();
  const { business, businessId } = useTenant();
  const currency = business?.currency ?? "IDR";
  const queryClient = useQueryClient();

  const canView = has("storefront.view");
  const canManage = has("storefront.orders");

  const [storefrontId, setStorefrontId] = useState<string | null>(null);

  const storefrontsQuery = useQuery({
    queryKey: queryKeys.storefronts(businessId),
    queryFn: fetchStorefronts,
    enabled: Boolean(businessId) && (canView || canManage),
    staleTime: 60_000,
  });

  const storefronts = storefrontsQuery.data ?? [];
  /** Default to the first storefront until the cashier picks another. */
  const activeId = storefrontId ?? storefronts[0]?.id ?? null;

  const ordersQuery = useQuery({
    queryKey: queryKeys.storefrontOrders(businessId, activeId ?? ""),
    queryFn: () => fetchStorefrontOrders(activeId as string),
    enabled: Boolean(businessId) && Boolean(activeId) && canManage,
    refetchInterval: 60_000,
  });

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: ["storefronts", businessId, activeId, "orders"],
    });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StorefrontOrderStatus }) =>
      updateStorefrontOrderStatus(id, status),
    onSuccess: refresh,
  });

  const pay = useMutation({
    mutationFn: (id: string) => markStorefrontOrderPaid(id),
    onSuccess: refresh,
  });

  const busy = advance.isPending || pay.isPending;
  const actionError = advance.error ?? pay.error;
  const orders = ordersQuery.data ?? [];

  if (!canManage) {
    return (
      <Screen>
        <AppHeader title="Storefront orders" subtitle="Online orders" showBack />
        <View style={styles.stateWrap}>
          <ErrorState
            forbidden
            title="Storefront orders are not enabled for your role"
            message="A manager can grant storefront order access in the Velora web app."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        title="Storefront orders"
        subtitle={activeId ? `${orders.length} orders` : "Online orders"}
        showBack
      />

      <ScreenScroll
        refreshing={ordersQuery.isRefetching}
        onRefresh={() => {
          void storefrontsQuery.refetch();
          void ordersQuery.refetch();
        }}
      >
        {storefrontsQuery.isPending ? (
          <View style={{ gap: 10 }}>
            <Skeleton height={44} />
            <Skeleton height={100} />
            <Skeleton height={100} />
          </View>
        ) : storefrontsQuery.isError ? (
          <ErrorState
            title="Could not load storefronts"
            message={errorMessage(storefrontsQuery.error, "Check the connection and try again.")}
            onRetry={() => void storefrontsQuery.refetch()}
          />
        ) : storefronts.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No storefront yet"
            description="Publish a storefront in the Velora web app to take online orders."
          />
        ) : (
          <View style={{ gap: 12 }}>
            <View style={styles.chipRow}>
              {storefronts.map((storefront) => {
                const active = storefront.id === activeId;
                return (
                  <Pressable
                    key={storefront.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setStorefrontId(storefront.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primarySoft : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                        borderRadius: radii.full,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      color={active ? colors.primary : colors.inkSecondary}
                      numberOfLines={1}
                    >
                      {storefront.name}
                      {storefront.orderCount > 0 ? ` · ${storefront.orderCount}` : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {ordersQuery.isPending ? (
              <View style={{ gap: 10 }}>
                <Skeleton height={100} />
                <Skeleton height={100} />
              </View>
            ) : ordersQuery.isError ? (
              <ErrorState
                title="Could not load orders"
                message={errorMessage(ordersQuery.error, "Check the connection and try again.")}
                onRetry={() => void ordersQuery.refetch()}
              />
            ) : orders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No orders yet"
                description="Orders placed on this storefront appear here as they come in."
              />
            ) : (
              <View style={{ gap: 10 }}>
                {orders.map((order) => {
                  const next = nextStatus(order);
                  const paid = order.paymentStatus === "paid";

                  return (
                    <Card key={order.id}>
                      <View style={styles.row}>
                        <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>
                          {order.number || `#${order.id}`}
                        </Text>
                        <Badge label={label(order.status)} tone={tone(order.status)} />
                      </View>

                      <Text variant="bodySmall" color={colors.inkMuted}>
                        {order.customerName} · {label(order.fulfilmentType)} ·{" "}
                        {formatDateTime(order.placedAt)}
                      </Text>

                      <View style={styles.row}>
                        <Text variant="title">{formatMoney(order.total, currency)}</Text>
                        <Badge
                          label={label(order.paymentStatus)}
                          tone={paid ? "success" : "warning"}
                        />
                      </View>

                      {actionError && (advance.isError || pay.isError) ? (
                        <Text variant="caption" color={colors.danger}>
                          {errorMessage(actionError)}
                        </Text>
                      ) : null}

                      <View style={styles.actions}>
                        {next ? (
                          <Button
                            label={`Mark ${label(next)}`}
                            size="sm"
                            variant="secondary"
                            loading={busy}
                            onPress={() => advance.mutate({ id: order.id, status: next })}
                            style={{ flex: 1 }}
                          />
                        ) : null}
                        {!paid && order.status !== "cancelled" ? (
                          <Button
                            label="Mark paid"
                            size="sm"
                            loading={busy}
                            onPress={() => pay.mutate(order.id)}
                            style={{ flex: 1 }}
                          />
                        ) : null}
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScreenScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    minHeight: 38,
    justifyContent: "center",
    borderWidth: 1,
    maxWidth: "100%",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
});
