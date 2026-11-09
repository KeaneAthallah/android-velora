import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import * as Crypto from "expo-crypto";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ShoppingBag,
  Store,
  Truck,
  Utensils,
  type LucideIcon,
} from "lucide-react-native";
import type { OrderType } from "@/api/types";
import type { SalePaymentInput } from "@/api/endpoints/sales";
import { errorMessage, isNetworkError } from "@/api/client";
import { formatMoney, formatQuantity } from "@/lib/format";
import { sumAmounts } from "@/lib/money";
import { useTheme } from "@/theme";
import { useTenant } from "@/providers/tenant-provider";
import { useOffline } from "@/providers/offline-provider";
import { useToast } from "@/components/providers/toast";
import { cartItemCount, useCartStore } from "@/features/pos/cart-store";
import { toSaleLines, useCartPreview, usePaymentMethods } from "@/features/pos/use-pos";
import { useCheckout } from "@/features/pos/use-checkout";
import { PaymentSection } from "@/features/pos/payment-section";
import { AppHeader } from "@/components/layout/app-header";
import { Screen, ScreenScroll } from "@/components/ui/screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";

const ORDER_TYPES: { value: OrderType; label: string; icon: LucideIcon }[] = [
  { value: "takeaway", label: "Takeaway", icon: ShoppingBag },
  { value: "dine_in", label: "Dine-in", icon: Utensils },
  { value: "pickup", label: "Pickup", icon: Store },
  { value: "delivery", label: "Delivery", icon: Truck },
];

export default function CheckoutScreen() {
  const { colors, fonts, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const { business, outlet } = useTenant();
  const { isOnline, enqueue } = useOffline();
  const { showToast } = useToast();

  const lines = useCartStore((state) => state.lines);
  const orderType = useCartStore((state) => state.orderType);
  const promotionCode = useCartStore((state) => state.promotionCode);
  const notes = useCartStore((state) => state.notes);
  const setOrderType = useCartStore((state) => state.setOrderType);
  const setPromotionCode = useCartStore((state) => state.setPromotionCode);
  const setNotes = useCartStore((state) => state.setNotes);
  const clear = useCartStore((state) => state.clear);

  const { preview, settling, error: previewError } = useCartPreview({
    lines,
    promotionCode,
  });
  const paymentMethods = usePaymentMethods();
  const checkout = useCheckout();

  const [payments, setPayments] = useState<SalePaymentInput[]>([]);
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const currency = business?.currency ?? "USD";
  const itemCount = cartItemCount(lines);

  const paid = useMemo(
    () => sumAmounts(payments.map((payment) => payment.amount)),
    [payments],
  );

  const totalValue = Number(preview?.total ?? 0);
  const outstanding = Math.round((totalValue - Number(paid)) * 10_000) / 10_000;
  const busy = checkout.stage === "creating" || checkout.stage === "paying";

  const deliveryIncomplete =
    orderType === "delivery" &&
    (deliveryPhone.trim().length === 0 || deliveryAddress.trim().length === 0);

  const ready =
    preview != null &&
    payments.length > 0 &&
    outstanding <= 0.00005 &&
    !deliveryIncomplete &&
    !busy;

  const submit = async () => {
    if (!preview || !ready) return;
    setError(null);

    if (!isOnline) {
      await enqueue({
        id: `${Date.now()}`,
        idempotencyKey: Crypto.randomUUID(),
        businessId: business?.id ?? "",
        outletId: outlet?.id ?? "",
        orderType,
        notes,
        promotionCode,
        items: toSaleLines(lines),
        payments,
        expectedTotal: preview.total,
        createdAt: Date.now(),
        status: "pending",
      });
      clear();
      setPayments([]);
      checkout.reset();
      showToast("Offline — sale queued and will sync when the connection returns.", "warning");
      router.replace("/sales");
      return;
    }

    try {
      const sale = await checkout.submit({
        items: toSaleLines(lines),
        orderType,
        notes,
        promotionCode,
        payments,
        expectedTotal: preview.total,
        fulfilment:
          orderType === "delivery"
            ? { contactPhone: deliveryPhone, address: deliveryAddress }
            : null,
      });

      clear();
      setPayments([]);
      checkout.reset();
      router.replace({
        pathname: "/receipt/[id]",
        params: { id: sale.id },
      });
    } catch (submitError) {
      if (isNetworkError(submitError)) {
        await enqueue({
          id: `${Date.now()}`,
          idempotencyKey: Crypto.randomUUID(),
          businessId: business?.id ?? "",
          outletId: outlet?.id ?? "",
          orderType,
          notes,
          promotionCode,
          items: toSaleLines(lines),
          payments,
          expectedTotal: preview.total,
          createdAt: Date.now(),
          status: "pending",
        });
        clear();
        setPayments([]);
        checkout.reset();
        // The cart is empty now, so this screen switches to its "Nothing to
        // check out" state and an inline message would never be seen.
        showToast("Connection dropped — sale queued for sync.", "warning");
        router.replace("/sales");
        return;
      }
      const message = errorMessage(submitError, "Checkout failed.");
      setError(message);
      showToast(message, "danger");
    }
  };

  if (lines.length === 0) {
    return (
      <Screen>
        <AppHeader showBack title="Checkout" subtitle="No open sale" />
        <View style={styles.stateWrap}>
          <EmptyState
            icon={ShoppingBag}
            title="Nothing to check out"
            description="The cart is empty. Add a product on the Sell screen first."
            actionLabel="Back to Sell"
            onAction={() => router.replace("/sales")}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        showBack
        title="Checkout"
        subtitle={
          outlet
            ? `${outlet.name} · ${formatQuantity(itemCount)} ${itemCount === 1 ? "item" : "items"}`
            : `${formatQuantity(itemCount)} items`
        }
      />

      <ScreenScroll bottomPadding={120} contentStyle={styles.content}>
        <Card style={styles.card}>
          <Text variant="title">Order</Text>

          <View style={styles.orderTypes}>
            {ORDER_TYPES.map((option) => {
              const active = orderType === option.value;
              const Icon = option.icon;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: active }}
                  onPress={() => setOrderType(option.value)}
                  style={[
                    styles.orderChip,
                    {
                      backgroundColor: active ? colors.primarySoft : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                      borderRadius: radii.md,
                    },
                  ]}
                >
                  <Icon size={15} color={active ? colors.primary : colors.inkMuted} />
                  <Text
                    variant="bodySmall"
                    color={active ? colors.primary : colors.inkSecondary}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {orderType === "delivery" ? (
            <View style={styles.deliveryFields}>
              <TextField
                label="Contact phone"
                value={deliveryPhone}
                onChangeText={setDeliveryPhone}
                keyboardType="phone-pad"
                placeholder="+62 812 3456 7890"
              />
              <TextField
                label="Delivery address"
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholder="Street, number, city"
                multiline
              />
            </View>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Text variant="title">Sale lines</Text>
            <Badge label={`${formatQuantity(itemCount)} items`} />
          </View>

          <View style={styles.lineList}>
            {lines.map((line) => (
              <View key={line.key} style={styles.lineRow}>
                <View style={styles.lineText}>
                  <Text variant="bodySmall" color={colors.ink} numberOfLines={2}>
                    {line.variantName ? `${line.name} · ${line.variantName}` : line.name}
                  </Text>
                  <Text variant="caption">
                    {formatQuantity(line.quantity)} × {formatMoney(line.unitPrice, currency)}
                    {line.discount ? ` · discount ${formatMoney(line.discount, currency)}` : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <Divider />

          <TextField
            label="Promotion code"
            value={promotionCode}
            onChangeText={setPromotionCode}
            placeholder="Optional"
            autoCapitalize="characters"
            autoCorrect={false}
            helper={
              preview?.promotion
                ? `${preview.promotion.name} applied — ${formatMoney(preview.promotionDiscount, currency)} off`
                : "The server prices the best automatic promotion when no code is entered."
            }
          />

          <TextField
            label="Note"
            value={notes}
            onChangeText={setNotes}
            placeholder="Allergies, table number, anything the kitchen should know"
            multiline
          />
        </Card>

        <Card style={styles.totalsCard}>
          {preview ? (
            <>
              <View style={styles.totalRow}>
                <Text variant="bodySmall">Subtotal</Text>
                <Text variant="bodySmall" color={colors.ink}>
                  {formatMoney(preview.subtotal, currency)}
                </Text>
              </View>

              {Number(preview.discountAmount) > 0 ? (
                <View style={styles.totalRow}>
                  <Text variant="bodySmall">Line discounts</Text>
                  <Text variant="bodySmall" color={colors.ink}>
                    − {formatMoney(preview.discountAmount, currency)}
                  </Text>
                </View>
              ) : null}

              {Number(preview.promotionDiscount) > 0 ? (
                <View style={styles.totalRow}>
                  <Text variant="bodySmall">
                    {preview.promotion?.name ?? "Promotion"}
                  </Text>
                  <Text variant="bodySmall" color={colors.success}>
                    − {formatMoney(preview.promotionDiscount, currency)}
                  </Text>
                </View>
              ) : null}

              {Number(preview.taxAmount) > 0 ? (
                <View style={styles.totalRow}>
                  <Text variant="bodySmall">Tax</Text>
                  <Text variant="bodySmall" color={colors.ink}>
                    {formatMoney(preview.taxAmount, currency)}
                  </Text>
                </View>
              ) : null}

              <Divider />

              <View style={styles.totalRow}>
                <Text variant="title">Total</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.ink }}>
                  {formatMoney(preview.total, currency)}
                </Text>
              </View>

              {settling ? <Text variant="caption">Updating totals…</Text> : null}
            </>
          ) : previewError ? (
            <Text variant="bodySmall" color={colors.danger}>
              {previewError instanceof Error
                ? previewError.message
                : "Could not price this cart."}
            </Text>
          ) : (
            <View style={styles.skeletonTotals}>
              <Skeleton width="40%" height={13} />
              <Skeleton width="60%" height={24} />
            </View>
          )}
        </Card>

        <PaymentSection
          methods={paymentMethods.data ?? []}
          loading={paymentMethods.isLoading}
          error={paymentMethods.isError ? paymentMethods.error : null}
          total={preview?.total ?? "0"}
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
            <Text
              variant="bodySmall"
              color={colors.danger}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              {error}
            </Text>
            {checkout.saleId ? (
              <Text variant="caption">
                The sale is already recorded. Retrying takes the payment again
                with the same key, so it cannot be charged twice.
              </Text>
            ) : null}
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
            {preview
              ? formatMoney(
                  outstanding > 0.00005 ? outstanding.toFixed(4) : preview.total,
                  currency,
                )
              : "—"}
          </Text>
        </View>

        <Button
          label={busy ? "Completing…" : "Complete sale"}
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
  content: {
    gap: 12,
  },
  card: {
    gap: 12,
  },
  orderTypes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  orderChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  deliveryFields: {
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lineList: {
    gap: 8,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  lineText: {
    flex: 1,
    gap: 1,
  },
  totalsCard: {
    gap: 8,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  skeletonTotals: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  errorCard: {
    gap: 6,
  },
  stateWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
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
  footerTotal: {
    flex: 1,
    gap: 1,
  },
  footerButton: {
    minWidth: 170,
  },
});
