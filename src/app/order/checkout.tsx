import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { errorMessage, isNetworkError } from "@/api/client";
import { formatMoney, formatQuantity } from "@/lib/format";
import { sumAmounts } from "@/lib/money";
import { useTheme } from "@/theme";
import { useTenant } from "@/providers/tenant-provider";
import { useOrder, useCheckoutOrderMutation } from "@/features/orders/use-orders";
import { usePaymentMethods } from "@/features/pos/use-pos";
import { PaymentSection } from "@/features/pos/payment-section";
import { AppHeader } from "@/components/layout/app-header";
import { Screen, ScreenScroll } from "@/components/ui/screen";
import { ReceiptText } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import type { SalePaymentInput } from "@/api/endpoints/sales";

export default function OrderCheckoutScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : (rawId ?? "");

  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const { business } = useTenant();

  const orderQuery = useOrder(id);
  const paymentMethods = usePaymentMethods();
  const checkoutMutation = useCheckoutOrderMutation();

  const [payments, setPayments] = useState<SalePaymentInput[]>([]);
  const [error, setError] = useState<string | null>(null);

  const currency = business?.currency ?? "USD";
  const order = orderQuery.data;

  const paid = useMemo(() => sumAmounts(payments.map((p) => p.amount)), [payments]);
  const totalValue = Number(order?.total ?? 0);
  const outstanding = Math.round((totalValue - Number(paid)) * 10_000) / 10_000;
  const busy = checkoutMutation.isPending;

  const ready = Boolean(order) && payments.length > 0 && outstanding <= 0.00005 && !busy;

  const submit = async () => {
    if (!order || !ready) return;
    setError(null);
    try {
      const sale = await checkoutMutation.mutateAsync({
        id: order.id,
        input: { payments, idempotencyKey: `${order.id}:checkout` },
      });
      router.replace({ pathname: "/receipt/[id]", params: { id: sale.id } });
    } catch (submitError) {
      setError(
        isNetworkError(submitError)
          ? "The connection dropped during checkout. Retry when you are back online."
          : errorMessage(submitError, "Checkout failed."),
      );
    }
  };

  if (orderQuery.isLoading) {
    return (
      <Screen>
        <AppHeader showBack title="Checkout" subtitle="Loading…" />
        <View style={styles.stateWrap}>
          <Skeleton height={96} radius={12} />
        </View>
      </Screen>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <Screen>
        <AppHeader showBack title="Checkout" subtitle="Order" />
        <View style={styles.stateWrap}>
          <ErrorState
            message={errorMessage(orderQuery.error, "This order could not be loaded.")}
            onRetry={() => void orderQuery.refetch()}
          />
        </View>
      </Screen>
    );
  }

  if (order.orderStatus !== "served" && order.orderStatus !== "ready") {
    return (
      <Screen>
        <AppHeader showBack title="Checkout" subtitle={order.orderNumber} />
        <View style={styles.stateWrap}>
          <EmptyState
            icon={ReceiptText}
            title="Order not ready to check out"
            description="Move the order to Ready or Served before taking payment."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        showBack
        title="Checkout order"
        subtitle={`${order.orderNumber} · ${formatQuantity(order.items.length)} lines`}
      />

      <ScreenScroll bottomPadding={120} contentStyle={styles.content}>
        <Card style={styles.card}>
          <Text variant="title">Order lines</Text>
          {order.items.map((line) => (
            <View key={line.id} style={styles.lineRow}>
              <View style={styles.lineText}>
                <Text variant="bodySmall" color={colors.ink} numberOfLines={2}>
                  {line.productName}
                </Text>
                <Text variant="caption">
                  {formatQuantity(line.quantity)} × {formatMoney(line.unitPrice, currency)}
                </Text>
              </View>
              <Text variant="bodySmall" color={colors.ink}>
                {formatMoney(line.lineTotal, currency)}
              </Text>
            </View>
          ))}
          <Divider />
          <View style={styles.totalRow}>
            <Text variant="title">Total</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.ink }}>
              {formatMoney(order.total, currency)}
            </Text>
          </View>
        </Card>

        <PaymentSection
          methods={paymentMethods.data ?? []}
          loading={paymentMethods.isLoading}
          error={paymentMethods.isError ? paymentMethods.error : null}
          total={order.total}
          currency={currency}
          payments={payments}
          onChange={(next) => {
            setPayments(next);
            setError(null);
          }}
          onRetryMethods={() => void paymentMethods.refetch()}
        />

        {error ? (
          <Card style={[styles.errorCard, { borderColor: colors.dangerBorder }]}>
            <Text variant="bodySmall" color={colors.danger}>{error}</Text>
          </Card>
        ) : null}
      </ScreenScroll>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <View style={styles.footerTotal}>
          <Text variant="caption">
            {outstanding > 0.00005 ? "Outstanding" : "Total"}
          </Text>
          <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.ink }}>
            {formatMoney(
              outstanding > 0.00005 ? outstanding.toFixed(4) : order.total,
              currency,
            )}
          </Text>
        </View>

        <Button
          label={busy ? "Completing…" : "Complete order"}
          onPress={() => void submit()}
          disabled={!ready}
          loading={busy}
          style={styles.footerButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  card: { gap: 10 },
  lineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  lineText: { flex: 1, gap: 1 },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  errorCard: { gap: 6 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  footerTotal: { flex: 1, gap: 1 },
  footerButton: { minWidth: 170 },
});