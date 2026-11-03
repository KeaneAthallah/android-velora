import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ban, ChefHat, ReceiptText } from "lucide-react-native";
import { errorMessage } from "@/api/client";
import { formatDateTime, formatMoney, formatQuantity } from "@/lib/format";
import { useTheme } from "@/theme";
import { useTenant } from "@/providers/tenant-provider";
import { useAuth } from "@/providers/auth-provider";
import { useOrder, useOrderStatusMutation, useCancelOrderMutation } from "@/features/orders/use-orders";
import { AppHeader } from "@/components/layout/app-header";
import { Screen, ScreenScroll } from "@/components/ui/screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { ErrorState } from "@/components/ui/error-state";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";

export default function OrderDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : (rawId ?? "");

  const { colors } = useTheme();
  const { business } = useTenant();
  const { has } = useAuth();
  const currency = business?.currency ?? "USD";

  const orderQuery = useOrder(id);
  const statusMutation = useOrderStatusMutation();
  const cancelMutation = useCancelOrderMutation();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);

  const order = orderQuery.data;
  const canManage = has("orders.manage");
  const canCancel = has("orders.cancel");

  const isOpen = order?.orderStatus === "open" || order?.orderStatus === "in_kitchen" || order?.orderStatus === "ready" || order?.orderStatus === "served";

  const nextStatus =
    order?.orderStatus === "open"
      ? "in_kitchen"
      : order?.orderStatus === "in_kitchen"
        ? "ready"
        : order?.orderStatus === "ready"
          ? "served"
          : null;

  const nextLabel =
    nextStatus === "in_kitchen"
      ? "Fire to kitchen"
      : nextStatus === "ready"
        ? "Mark ready"
        : nextStatus === "served"
          ? "Mark served"
          : null;

  const handleStatus = async () => {
    if (!order || !nextStatus) return;
    try {
      await statusMutation.mutateAsync({ id: order.id, status: nextStatus });
    } catch {
      // surface via mutation error if needed; keep simple
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    setCancelError(null);
    try {
      await cancelMutation.mutateAsync({ id: order.id, reason: reason.trim() });
      setCancelOpen(false);
      setReason("");
    } catch (error) {
      setCancelError(errorMessage(error, "Could not cancel this order."));
    }
  };

  return (
    <Screen>
      <AppHeader
        showBack
        title={order?.orderNumber ?? "Order"}
        subtitle={order ? formatDateTime(order.createdAt) : "Loading…"}
      />

      <ScreenScroll bottomPadding={32} contentStyle={styles.content}>
        {orderQuery.isLoading ? (
          <Card style={styles.card}>
            <Skeleton width="55%" height={18} />
            <Skeleton width="100%" height={44} radius={10} />
            <Skeleton width="100%" height={44} radius={10} />
          </Card>
        ) : orderQuery.isError || !order ? (
          <ErrorState
            message={errorMessage(orderQuery.error, "This order could not be loaded.")}
            onRetry={() => void orderQuery.refetch()}
          />
        ) : (
          <>
            <Card style={styles.card}>
              <View style={styles.brandRow}>
                <View style={[styles.brandTile, { backgroundColor: colors.primarySoft }]}>
                  <ChefHat size={18} color={colors.primary} />
                </View>
                <View style={styles.brandText}>
                  <Text variant="title" numberOfLines={1}>
                    {order.orderNumber}
                  </Text>
                  <Text variant="caption">
                    {order.orderType.replace("_", " ")}
                  </Text>
                </View>
                <Badge
                  label={order.orderStatus || order.status}
                  tone={
                    order.orderStatus === "ready"
                      ? "success"
                      : order.orderStatus === "in_kitchen"
                        ? "warning"
                        : "neutral"
                  }
                />
              </View>

              <Divider />

              <MetaRow label="Order" value={order.orderNumber} />
              <MetaRow label="Type" value={order.orderType.replace("_", " ")} />
              <MetaRow label="Status" value={order.orderStatus || order.status} />
              <MetaRow label="Date" value={formatDateTime(order.createdAt)} />
              {order.notes ? <MetaRow label="Note" value={order.notes} /> : null}
            </Card>

            <Card style={styles.card}>
              <Text variant="title">Items</Text>
              <View style={styles.items}>
                {order.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemText}>
                      <Text variant="bodySmall" color={colors.ink} numberOfLines={2}>
                        {item.productName}
                      </Text>
                      <Text variant="caption">
                        {formatQuantity(item.quantity)} × {formatMoney(item.unitPrice, currency)}
                        {Number(item.discountAmount) > 0
                          ? ` · −${formatMoney(item.discountAmount, currency)}`
                          : ""}
                      </Text>
                      {item.notes ? <Text variant="caption">{item.notes}</Text> : null}
                    </View>
                    <Text variant="bodySmall" color={colors.ink} style={styles.itemTotal}>
                      {formatMoney(item.lineTotal, currency)}
                    </Text>
                  </View>
                ))}
              </View>

              <Divider />

              <TotalRow label="Subtotal" value={formatMoney(order.subtotal, currency)} />
              {Number(order.discountAmount) > 0 ? (
                <TotalRow label="Discounts" value={`− ${formatMoney(order.discountAmount, currency)}`} />
              ) : null}
              {Number(order.taxAmount) > 0 ? (
                <TotalRow label="Tax" value={formatMoney(order.taxAmount, currency)} />
              ) : null}
              <Divider />
              <TotalRow label="Total" value={formatMoney(order.total, currency)} emphasis />
            </Card>

            {isOpen && canManage ? (
              <View style={styles.actions}>
                {nextStatus && nextLabel ? (
                  <Button
                    label={nextLabel}
                    icon={<ChefHat size={15} color={colors.primaryForeground} />}
                    onPress={() => void handleStatus()}
                    loading={statusMutation.isPending}
                    fullWidth
                  />
                ) : null}

                {order.orderStatus === "served" || order.orderStatus === "ready" ? (
                  <Button
                    label="Checkout & pay"
                    variant="secondary"
                    icon={<ReceiptText size={15} color={colors.ink} />}
                    onPress={() =>
                      router.push({ pathname: "/order/checkout", params: { id: order.id } })
                    }
                    fullWidth
                  />
                ) : null}

                {canCancel ? (
                  <Button
                    label="Cancel order"
                    variant="secondary"
                    icon={<Ban size={15} color={colors.danger} />}
                    onPress={() => {
                      setCancelError(null);
                      setCancelOpen(true);
                    }}
                    fullWidth
                  />
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScreenScroll>

      <Sheet
        visible={cancelOpen}
        onClose={() => {
          if (cancelMutation.isPending) return;
          setCancelOpen(false);
        }}
        title="Cancel this order"
        description="The tab is closed and the kitchen is notified."
      >
        <View style={styles.voidForm}>
          <TextField
            label="Reason"
            value={reason}
            onChangeText={setReason}
            placeholder="Customer changed their mind…"
            multiline
            autoFocus
            error={cancelError}
          />
          <Button
            label="Cancel order"
            variant="danger"
            loading={cancelMutation.isPending}
            disabled={reason.trim().length < 3}
            onPress={() => void handleCancel()}
            fullWidth
          />
        </View>
      </Sheet>
    </Screen>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaRow}>
      <Text variant="bodySmall">{label}</Text>
      <Text variant="bodySmall" color={colors.ink} numberOfLines={2} style={styles.metaValue}>
        {value}
      </Text>
    </View>
  );
}

function TotalRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  const { colors, fonts } = useTheme();
  return (
    <View style={styles.metaRow}>
      <Text variant={emphasis ? "title" : "bodySmall"}>{label}</Text>
      <Text
        style={{
          fontFamily: emphasis ? fonts.bold : fonts.medium,
          fontSize: emphasis ? 20 : 13.5,
          color: colors.ink,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  card: { gap: 10 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandTile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { flex: 1, gap: 1 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  metaValue: { flexShrink: 1, textAlign: "right" },
  items: { gap: 10 },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  itemText: { flex: 1, gap: 1 },
  itemTotal: { minWidth: 80, textAlign: "right" },
  actions: { gap: 10, marginTop: 4 },
  voidForm: { gap: 12, paddingBottom: 8 },
});