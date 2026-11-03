import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Barcode, Boxes, Layers, Tag } from "lucide-react-native";
import { useTheme } from "@/theme";
import { useTenant } from "@/providers/tenant-provider";
import { useProduct } from "@/features/products/use-products";
import { formatMoney } from "@/lib/format";
import { AppHeader } from "@/components/layout/app-header";
import { Screen, ScreenScroll } from "@/components/ui/screen";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Text } from "@/components/ui/text";

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors, fonts } = useTheme();

  return (
    <View style={styles.detailRow}>
      <Text variant="bodySmall">{label}</Text>
      <Text
        variant="bodySmall"
        color={colors.ink}
        numberOfLines={2}
        style={[styles.detailValue, { fontFamily: fonts.semibold }]}
      >
        {value}
      </Text>
    </View>
  );
}

function LoadingProduct() {
  return (
    <View style={styles.loading}>
      <Card style={styles.skeletonHero}>
        <Skeleton width="30%" height={18} radius={999} />
        <Skeleton width="75%" height={26} />
        <Skeleton width="50%" height={30} />
      </Card>
      <Card style={styles.loading}>
        <Skeleton width="40%" height={12} />
        <Skeleton width="70%" height={12} />
        <Skeleton width="55%" height={12} />
      </Card>
    </View>
  );
}

export default function ProductDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = params.id;
  const productId = Array.isArray(rawId) ? rawId[0] : rawId ?? null;

  const { colors } = useTheme();
  const { business } = useTenant();
  const productQuery = useProduct(productId ?? null);
  const product = productQuery.data;

  const currency = business?.currency ?? "USD";

  return (
    <Screen>
      <AppHeader
        showBack
        title="Product"
        subtitle={product?.sku ?? "Catalogue item"}
      />

      <ScreenScroll bottomPadding={32} contentStyle={styles.content}>
        {productQuery.isLoading ? (
          <LoadingProduct />
        ) : productQuery.isError || !product ? (
          <ErrorState
            message={
              productQuery.error instanceof Error
                ? productQuery.error.message
                : "This product could not be loaded."
            }
            onRetry={() => void productQuery.refetch()}
          />
        ) : (
          <>
            <Card style={styles.hero}>
              <View style={styles.badgeRow}>
                <Badge
                  label={product.category?.name ?? "Uncategorised"}
                  tone="primary"
                />
                <Badge
                  label={product.isActive ? "Active" : "Inactive"}
                  tone={product.isActive ? "success" : "warning"}
                />
                {product.isCombo ? <Badge label="Combo" tone="info" /> : null}
              </View>

              <Text variant="display" style={styles.name}>
                {product.name}
              </Text>

              {product.description ? (
                <Text variant="bodySmall">{product.description}</Text>
              ) : null}

              <View style={styles.priceRow}>
                <View>
                  <Text variant="caption">Selling price</Text>
                  <Text variant="heading">
                    {formatMoney(product.sellingPrice, currency)}
                  </Text>
                </View>
                <View style={styles.priceUnit}>
                  <Text variant="caption">Per</Text>
                  <Text variant="title">{product.unit}</Text>
                </View>
              </View>
            </Card>

            <View>
              <Card style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                  <Tag size={16} color={colors.inkMuted} />
                  <Text variant="title">Details</Text>
                </View>

                <DetailRow label="SKU" value={product.sku} />
                <DetailRow
                  label="Category"
                  value={product.category?.name ?? "Uncategorised"}
                />
                <DetailRow
                  label="Cost price"
                  value={formatMoney(product.costPrice, currency)}
                />
                <DetailRow label="Unit" value={product.unit} />
                <DetailRow
                  label="Inventory"
                  value={
                    product.trackInventory
                      ? "Tracked at the outlet"
                      : "Not stock-tracked"
                  }
                />
                <DetailRow
                  label="Type"
                  value={product.isCombo ? "Combo / bundle" : "Standard product"}
                />
              </Card>
            </View>

            {product.variants.length > 0 ? (
              <View>
                <Card style={styles.sectionCard}>
                  <View style={styles.sectionTitleRow}>
                    <Layers size={16} color={colors.inkMuted} />
                    <Text variant="title">Variants</Text>
                    <Badge
                      label={String(product.variants.length)}
                      tone="neutral"
                    />
                  </View>

                  {product.variants.map((variant) => (
                    <View
                      key={variant.id}
                      style={[styles.variant, { borderTopColor: colors.border }]}
                    >
                      <View style={styles.variantText}>
                        <Text variant="body" numberOfLines={1}>
                          {variant.name}
                        </Text>
                        <Text variant="caption" numberOfLines={1}>
                          {variant.sku}
                          {variant.barcode ? ` · ${variant.barcode}` : ""}
                        </Text>
                      </View>

                      <View style={styles.variantRight}>
                        <Text variant="bodySmall" color={colors.ink}>
                          {formatMoney(
                            variant.sellingPrice ?? product.sellingPrice,
                            currency,
                          )}
                        </Text>
                        {!variant.isActive ? (
                          <Badge label="Inactive" tone="warning" />
                        ) : null}
                      </View>
                    </View>
                  ))}
                </Card>
              </View>
            ) : null}

            {product.barcodes.length > 0 ? (
              <View>
                <Card style={styles.sectionCard}>
                  <View style={styles.sectionTitleRow}>
                    <Barcode size={16} color={colors.inkMuted} />
                    <Text variant="title">Barcodes</Text>
                  </View>

                  {product.barcodes.map((barcode) => {
                    const variant = product.variants.find(
                      (item) => item.id === barcode.variantId,
                    );
                    return (
                      <DetailRow
                        key={barcode.id}
                        label={barcode.barcode}
                        value={variant?.name ?? product.name}
                      />
                    );
                  })}
                </Card>
              </View>
            ) : null}

            <View style={[styles.note, { backgroundColor: colors.surfaceMuted }]}>
              <Boxes size={15} color={colors.inkMuted} />
              <Text variant="caption" style={styles.noteText}>
                Products are read-only in the mobile app for now. Create and
                edit them in the Velora web app.
              </Text>
            </View>
          </>
        )}
      </ScreenScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
  },
  loading: {
    gap: 12,
  },
  skeletonHero: {
    gap: 12,
  },
  hero: {
    gap: 10,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  name: {
    fontSize: 27,
    lineHeight: 33,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 6,
  },
  priceUnit: {
    alignItems: "flex-end",
    gap: 1,
  },
  sectionCard: {
    gap: 2,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 18,
    paddingVertical: 7,
  },
  detailValue: {
    flexShrink: 1,
    textAlign: "right",
  },
  variant: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    marginTop: 4,
  },
  variantText: {
    flex: 1,
    gap: 1,
  },
  variantRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 12,
    borderRadius: 10,
  },
  noteText: {
    flex: 1,
  },
});
