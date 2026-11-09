import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Minus, Plus, ShoppingCart, Tag, Trash2 } from "lucide-react-native";
import type { CartPreview } from "@/api/types";
import { formatMoney, formatQuantity } from "@/lib/format";
import { useTheme } from "@/theme";
import {
  cartItemCount,
  useCartStore,
  type CartLine,
} from "@/features/pos/cart-store";
import { isNetworkError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";

type CartPanelProps = {
  lines: CartLine[];
  currency: string;
  preview: CartPreview | undefined;
  settling: boolean;
  previewError: unknown;
  onCheckout: () => void;
  onClear: () => void;
  onOpenTab?: () => void;
  openTabPending?: boolean;
};

function TotalsRow({
  label,
  value,
  emphasis = false,
  muted = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  muted?: boolean;
}) {
  const { colors, fonts } = useTheme();

  return (
    <View style={styles.totalsRow}>
      <Text variant={emphasis ? "title" : "bodySmall"} color={muted ? colors.inkMuted : undefined}>
        {label}
      </Text>
      <Text
        style={{
          fontFamily: emphasis ? fonts.bold : fonts.medium,
          fontSize: emphasis ? 19 : 13.5,
          color: emphasis ? colors.ink : muted ? colors.inkMuted : colors.inkSecondary,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function QuantityStepper({ line }: { line: CartLine }) {
  const { colors, radii } = useTheme();
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const removeLine = useCartStore((state) => state.removeLine);

  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          line.quantity <= 1
            ? `Remove ${line.name} from the cart`
            : `Decrease ${line.name} quantity`
        }
        hitSlop={8}
        onPress={() => {
          if (line.quantity <= 1) removeLine(line.key);
          else decrement(line.key);
        }}
        style={({ pressed }) => [
          styles.stepperButton,
          {
            backgroundColor: colors.surfaceMuted,
            borderRadius: radii.sm,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        {line.quantity <= 1 ? (
          <Trash2 size={14} color={colors.danger} />
        ) : (
          <Minus size={14} color={colors.ink} />
        )}
      </Pressable>

      <Text style={styles.quantity} numberOfLines={1}>
        {formatQuantity(line.quantity)}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${line.name} quantity`}
        hitSlop={8}
        onPress={() => increment(line.key)}
        style={({ pressed }) => [
          styles.stepperButton,
          {
            backgroundColor: colors.primarySoft,
            borderRadius: radii.sm,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Plus size={14} color={colors.primary} />
      </Pressable>
    </View>
  );
}

/** Cart review: lines, line discounts and the server-priced totals. */
export function CartPanel({
  lines,
  currency,
  preview,
  settling,
  previewError,
  onCheckout,
  onClear,
  onOpenTab,
  openTabPending,
}: CartPanelProps) {
  const { colors, fonts, radii } = useTheme();
  const setDiscount = useCartStore((state) => state.setDiscount);
  const removeLine = useCartStore((state) => state.removeLine);

  const [discountLineKey, setDiscountLineKey] = useState<string | null>(null);
  const [discountInput, setDiscountInput] = useState("");

  const discountLine = lines.find((line) => line.key === discountLineKey) ?? null;
  const itemCount = cartItemCount(lines);

  const openDiscount = (line: CartLine) => {
    setDiscountLineKey(line.key);
    setDiscountInput(line.discount);
  };

  const closeDiscount = () => {
    setDiscountLineKey(null);
    setDiscountInput("");
  };

  const applyDiscount = () => {
    if (!discountLine) return;
    const cleaned = discountInput.replace(/[^\d.,]/g, "").replace(",", ".");
    if (discountInput.trim() === "") {
      setDiscount(discountLine.key, "");
      closeDiscount();
      return;
    }
    const value = Number(cleaned);
    if (!Number.isFinite(value) || value < 0) return;
    // Clamp to the line's face value so the server never sees a negative line.
    const face = Number(discountLine.unitPrice) * discountLine.quantity;
    const capped = Math.min(value, face);
    setDiscount(discountLine.key, String(Math.round(capped * 10_000) / 10_000));
    closeDiscount();
  };

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Cart is empty"
        description="Tap a product to add it. Totals are priced by the server as you go."
        compact
      />
    );
  }

  const hasDiscounts =
    preview != null && Number(preview.discountAmount) + Number(preview.promotionDiscount) > 0;
  const hasTax = preview != null && Number(preview.taxAmount) > 0;

  return (
    <View style={styles.root}>
      <View style={styles.lines}>
        {lines.map((line) => (
          <View key={line.key} style={[styles.line, { borderColor: colors.border }]}>
            <View style={styles.lineBody}>
              <View style={styles.lineTitleRow}>
                <Text variant="body" numberOfLines={2} style={styles.lineName}>
                  {line.variantName ? `${line.name} · ${line.variantName}` : line.name}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.semibold,
                    fontSize: 13,
                    color: colors.ink,
                  }}
                  numberOfLines={1}
                >
                  {formatMoney(line.unitPrice, currency)}
                </Text>
              </View>

              <View style={styles.lineMeta}>
                <Text variant="caption" numberOfLines={1} style={styles.lineSku}>
                  {line.sku}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add a discount to ${line.name}`}
                  hitSlop={6}
                  onPress={() => openDiscount(line)}
                  style={styles.linkButton}
                >
                  <Tag size={12} color={colors.inkMuted} />
                  <Text variant="caption">
                    {line.discount ? formatMoney(line.discount, currency) : "Discount"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.lineActions}>
                <QuantityStepper line={line} />

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${line.name}`}
                  hitSlop={6}
                  onPress={() => removeLine(line.key)}
                  style={styles.removeButton}
                >
                  <Trash2 size={15} color={colors.inkMuted} />
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </View>

      <Divider />

      <View style={styles.totals}>
        {preview ? (
          <>
            <TotalsRow label="Subtotal" value={formatMoney(preview.subtotal, currency)} muted />
            {hasDiscounts ? (
              <TotalsRow
                label={
                  preview.promotion
                    ? `Discounts · ${preview.promotion.name}`
                    : "Discounts"
                }
                value={`− ${formatMoney(
                  String(Number(preview.discountAmount) + Number(preview.promotionDiscount)),
                  currency,
                )}`}
              />
            ) : null}
            {hasTax ? (
              <TotalsRow label="Tax" value={formatMoney(preview.taxAmount, currency)} muted />
            ) : null}
            <TotalsRow label="Total" value={formatMoney(preview.total, currency)} emphasis />
          </>
        ) : previewError ? (
          <Text
            variant="bodySmall"
            color={colors.danger}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {isNetworkError(previewError)
              ? "Can’t price this cart while offline. Reconnect before taking payment."
              : previewError instanceof Error
                ? previewError.message
                : "Could not price this cart."}
          </Text>
        ) : (
          <View style={styles.pricingSkeleton}>
            <Skeleton width="45%" height={12} />
            <Skeleton width="30%" height={20} />
          </View>
        )}

        {settling && preview ? (
          <Text variant="caption">Updating totals…</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          label={
            preview ? `Checkout · ${formatMoney(preview.total, currency)}` : "Checkout"
          }
          onPress={onCheckout}
          disabled={!preview}
          fullWidth
        />
        {onOpenTab ? (
          <Button
            label={openTabPending ? "Opening tab…" : "Open as tab"}
            variant="secondary"
            onPress={onOpenTab}
            disabled={!preview || openTabPending}
            loading={openTabPending}
            fullWidth
          />
        ) : null}
        <View style={styles.secondaryActions}>
          <Text variant="caption">
            {formatQuantity(itemCount)} {itemCount === 1 ? "item" : "items"}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear the cart"
            hitSlop={10}
            onPress={onClear}
          >
            <Text variant="caption" color={colors.danger}>
              Clear cart
            </Text>
          </Pressable>
        </View>
      </View>

      <Sheet
        visible={discountLine != null}
        onClose={closeDiscount}
        title="Line discount"
        description={
          discountLine
            ? `${discountLine.name} · ${formatMoney(discountLine.unitPrice, currency)} each`
            : undefined
        }
      >
        <View style={styles.discountSheet}>
          <TextField
            label={`Discount amount (${currency})`}
            value={discountInput}
            onChangeText={setDiscountInput}
            keyboardType="decimal-pad"
            placeholder="0"
            helper="Applied to this line only. Promotions are priced separately."
          />

          <View style={styles.discountActions}>
            <Button
              label="Remove"
              variant="secondary"
              size="sm"
              onPress={() => {
                if (discountLine) setDiscount(discountLine.key, "");
                closeDiscount();
              }}
            />
            <Button label="Apply" size="sm" onPress={applyDiscount} />
          </View>

          <Text variant="caption" style={[styles.discountHint, { borderRadius: radii.sm }]}>
            The server recalculates discount, tax and total after every change.
          </Text>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  lines: {
    gap: 4,
  },
  line: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  lineBody: {
    gap: 6,
  },
  lineTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  lineName: {
    flex: 1,
    fontSize: 14.5,
  },
  lineMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  lineSku: {
    flexShrink: 1,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  lineActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepperButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  quantity: {
    minWidth: 30,
    textAlign: "center",
    fontSize: 14,
  },
  removeButton: {
    padding: 4,
  },
  totals: {
    gap: 6,
  },
  totalsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pricingSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  actions: {
    gap: 10,
  },
  secondaryActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  discountSheet: {
    gap: 14,
    paddingBottom: 8,
  },
  discountActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  discountHint: {
    paddingHorizontal: 0,
  },
});
