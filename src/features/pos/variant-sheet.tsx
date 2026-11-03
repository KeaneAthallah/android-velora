import { Pressable, StyleSheet, View } from "react-native";
import { Layers } from "lucide-react-native";
import type { Product } from "@/api/types";
import { formatMoney } from "@/lib/format";
import { useTheme } from "@/theme";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";

type VariantSheetProps = {
  product: Product | null;
  currency: string;
  onSelect: (product: Product, variantId: string | null) => void;
  onClose: () => void;
};

/** Variant chooser shown before a variant product joins a sale line. */
export function VariantSheet({
  product,
  currency,
  onSelect,
  onClose,
}: VariantSheetProps) {
  const { colors, radii } = useTheme();
  const variants = (product?.variants ?? []).filter((variant) => variant.isActive);

  return (
    <Sheet
      visible={product != null}
      onClose={onClose}
      title={product?.name ?? "Choose an option"}
      description="Pick the variant you are selling."
    >
      <View style={styles.list}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sell ${product?.name ?? "product"} without a variant`}
          onPress={() => {
            if (product) onSelect(product, null);
          }}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: colors.surfaceMuted,
              borderRadius: radii.md,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Layers size={16} color={colors.inkMuted} />
          <Text variant="body" style={styles.rowLabel}>
            No variant
          </Text>
          <Text variant="bodySmall">
            {product ? formatMoney(product.sellingPrice, currency) : ""}
          </Text>
        </Pressable>

        {variants.map((variant) => (
          <Pressable
            key={variant.id}
            accessibilityRole="button"
            accessibilityLabel={`Sell ${product?.name ?? "product"} ${variant.name}`}
            onPress={() => {
              if (product) onSelect(product, variant.id);
            }}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.md,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={styles.rowText}>
              <Text variant="body">{variant.name}</Text>
              <Text variant="caption">{variant.sku}</Text>
            </View>
            <Text variant="bodySmall" color={colors.ink}>
              {formatMoney(variant.sellingPrice ?? product?.sellingPrice ?? "0", currency)}
            </Text>
          </Pressable>
        ))}

        {variants.length === 0 ? (
          <View style={styles.empty}>
            <Badge label="No active variants" tone="warning" />
            <Text variant="caption" align="center">
              Every variant of this product is inactive. Selling it without a
              variant uses the product price.
            </Text>
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    paddingBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "transparent",
  },
  rowLabel: {
    flex: 1,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  empty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
});
