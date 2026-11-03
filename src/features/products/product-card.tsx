import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Package } from "lucide-react-native";
import type { Product } from "@/api/types";
import { formatMoney } from "@/lib/format";
import { useTheme } from "@/theme";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

type ProductCardProps = {
  product: Product;
  currency: string;
};

export function ProductCard({ product, currency }: ProductCardProps) {
  const { colors, fonts, radii } = useTheme();

  const monogram = product.name.trim().charAt(0).toUpperCase() || "?";
  const variantCount = product.variants.length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatMoney(product.sellingPrice, currency)}`}
      onPress={() =>
        router.push({
          pathname: "/products/[id]",
          params: { id: product.id },
        })
      }
      style={({ pressed }) => [styles.root, pressed ? { opacity: 0.85 } : null]}
    >
      <Card padded={false} style={styles.card}>
        <View
          style={[
            styles.media,
            { backgroundColor: colors.primarySoft, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
          ]}
        >
          <Text style={{ fontSize: 26, lineHeight: 32, color: colors.primary, fontFamily: fonts.extrabold }}>
            {monogram}
          </Text>
          {product.isCombo ? (
            <View style={styles.mediaBadge}>
              <Badge label="Combo" tone="info" />
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <Text variant="label" numberOfLines={1} style={styles.category}>
            {product.category?.name ?? "Uncategorised"}
          </Text>

          <Text variant="title" numberOfLines={2} style={styles.name}>
            {product.name}
          </Text>

          <View style={styles.meta}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }} numberOfLines={1}>
              {formatMoney(product.sellingPrice, currency)}
            </Text>

            <View style={styles.metaRow}>
              <Text variant="caption" numberOfLines={1} style={styles.sku}>
                {product.sku}
              </Text>
              {!product.isActive ? <Badge label="Inactive" tone="warning" /> : null}
            </View>

            {variantCount > 0 ? (
              <View style={styles.variantRow}>
                <Package size={11} color={colors.inkMuted} />
                <Text variant="caption">
                  {variantCount} {variantCount === 1 ? "variant" : "variants"}
                </Text>
              </View>
            ) : null}
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
    height: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaBadge: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  body: {
    flex: 1,
    padding: 11,
    gap: 4,
  },
  category: {
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  name: {
    fontSize: 14,
    lineHeight: 19,
    minHeight: 38,
  },
  meta: {
    marginTop: "auto",
    gap: 3,
    paddingTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  sku: {
    flexShrink: 1,
  },
  variantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
