import { Pressable, StyleSheet, View } from "react-native";
import { Layers, Plus } from "lucide-react-native";
import type { Product } from "@/api/types";
import { formatMoney } from "@/lib/format";
import { useTheme } from "@/theme";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

type RegisterProductTileProps = {
  product: Product;
  currency: string;
  /** Quantity already in the cart for this product (all variants). */
  inCart: number;
  onPress: (product: Product) => void;
  columns: number;
};

/**
 * Catalogue tile for the register. Tapping it adds one to the cart; products
 * with variants open a chooser first so the sale line is never ambiguous.
 */
export function RegisterProductTile({
  product,
  currency,
  inCart,
  onPress,
  columns,
}: RegisterProductTileProps) {
  const { colors, fonts, radii } = useTheme();
  const hasVariants = product.variants.some((variant) => variant.isActive);
  const monogram = product.name.trim().charAt(0).toUpperCase() || "?";
  const compact = columns >= 3;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${product.name} to cart`}
      onPress={() => onPress(product)}
      style={({ pressed }) => [styles.root, pressed ? { opacity: 0.82 } : null]}
    >
      <Card padded={false} style={styles.card}>
        <View
          style={[
            styles.media,
            {
              backgroundColor: colors.primarySoft,
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
              height: compact ? 44 : 56,
            },
          ]}
        >
          <Text
            style={{
              fontSize: compact ? 18 : 22,
              lineHeight: compact ? 24 : 28,
              color: colors.primary,
              fontFamily: fonts.extrabold,
            }}
          >
            {monogram}
          </Text>

          {inCart > 0 ? (
            <View
              style={[
                styles.countPill,
                { backgroundColor: colors.primary, borderRadius: radii.full },
              ]}
            >
              <Text
                style={{
                  fontSize: 10,
                  lineHeight: 13,
                  color: colors.primaryForeground,
                  fontFamily: fonts.semibold,
                }}
              >
                {inCart}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <Text
            variant="title"
            numberOfLines={2}
            style={[styles.name, compact ? styles.nameCompact : null]}
          >
            {product.name}
          </Text>

          <View style={styles.footer}>
            <Text
              style={{
                fontFamily: fonts.semibold,
                fontSize: compact ? 12.5 : 14,
                color: colors.ink,
              }}
              numberOfLines={1}
            >
              {formatMoney(product.sellingPrice, currency)}
            </Text>

            {hasVariants ? (
              <View style={styles.variantHint}>
                <Layers size={11} color={colors.inkMuted} />
                <Text variant="caption" style={styles.variantText}>
                  {product.variants.length}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.addButton,
                  { backgroundColor: colors.primarySoft, borderRadius: radii.full },
                ]}
              >
                <Plus size={12} color={colors.primary} />
              </View>
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  card: {
    flex: 1,
    overflow: "hidden",
  },
  media: {
    alignItems: "center",
    justifyContent: "center",
  },
  countPill: {
    position: "absolute",
    top: 5,
    right: 5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    padding: 9,
    gap: 4,
    justifyContent: "space-between",
  },
  name: {
    fontSize: 13,
    lineHeight: 17,
    minHeight: 34,
  },
  nameCompact: {
    fontSize: 12.5,
    lineHeight: 16,
    minHeight: 32,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  variantHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  variantText: {
    fontSize: 11,
  },
  addButton: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
