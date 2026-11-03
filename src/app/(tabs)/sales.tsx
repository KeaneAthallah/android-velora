import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Crypto from "expo-crypto";
import {
  ChevronRight,
  PackageSearch,
  ShoppingCart,
  SlidersHorizontal,
} from "lucide-react-native";
import type { Product } from "@/api/types";
import { useTheme } from "@/theme";
import { useAuth } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { useResponsive } from "@/lib/use-responsive";
import { formatMoney, formatQuantity } from "@/lib/format";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCategories, useInfiniteProducts } from "@/features/products/use-products";
import { cartItemCount, useCartStore } from "@/features/pos/cart-store";
import { useCartPreview, toSaleLines } from "@/features/pos/use-pos";
import { RegisterProductTile } from "@/features/pos/register-product-tile";
import { CartPanel } from "@/features/pos/cart-panel";
import { useCreateOrderMutation } from "@/features/orders/use-orders";
import { VariantSheet } from "@/features/pos/variant-sheet";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

type GridCell = { key: string; product: Product | null };

function SkeletonGrid({ columns, gap }: { columns: number; gap: number }) {
  return (
    <FlatList
      data={Array.from({ length: columns * 3 }, (_, index) => index)}
      key={`skeleton-${columns}`}
      numColumns={columns}
      scrollEnabled={false}
      keyExtractor={(item) => String(item)}
      columnWrapperStyle={{ gap }}
      contentContainerStyle={{ gap, paddingHorizontal: 16, paddingTop: 4 }}
      renderItem={() => (
        <View style={styles.cell}>
          <Card style={styles.skeletonCard}>
            <Skeleton height={48} radius={10} />
            <Skeleton width="80%" height={12} />
            <Skeleton width="50%" height={12} />
          </Card>
        </View>
      )}
    />
  );
}

export default function SalesScreen() {
  const { colors, fonts, radii } = useTheme();
  const { has, session } = useAuth();
  const { business, businessId, outlet } = useTenant();
  const { width, isTablet, gridColumns, gutter } = useResponsive();

  const lines = useCartStore((state) => state.lines);
  const promotionCode = useCartStore((state) => state.promotionCode);
  const ensureScope = useCartStore((state) => state.ensureScope);
  const clear = useCartStore((state) => state.clear);
  const addProduct = useCartStore((state) => state.addProduct);
  const notes = useCartStore((state) => state.notes);
  const orderType = useCartStore((state) => state.orderType);

  const createOrderMutation = useCreateOrderMutation();

  const [searchInput, setSearchInput] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const currency = business?.currency ?? "USD";

  // A cart belongs to one outlet: switching outlet starts a fresh sale.
  const scope = businessId && outlet ? `${businessId}:${outlet.id}` : null;
  useEffect(() => {
    ensureScope(scope);
  }, [scope, ensureScope]);

  const search = useDebouncedValue(searchInput.trim(), 300);
  const productsQuery = useInfiniteProducts({
    search,
    categoryId,
    activeOnly: true,
  });
  const categoriesQuery = useCategories();
  const {
    preview,
    settling,
    error: previewError,
  } = useCartPreview({ lines, promotionCode });

  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [productsQuery.data],
  );

  const categories = categoriesQuery.data ?? [];
  const itemCount = cartItemCount(lines);

  const wide = isTablet && width >= 820;
  const columns = wide ? 3 : gridColumns;

  const inCartByProduct = useMemo(() => {
    const counts = new Map<string, number>();
    for (const line of lines) {
      counts.set(line.productId, (counts.get(line.productId) ?? 0) + line.quantity);
    }
    return counts;
  }, [lines]);

  const cells = useMemo<GridCell[]>(() => {
    const next: GridCell[] = products.map((product) => ({
      key: product.id,
      product,
    }));
    const remainder = next.length % columns;
    if (remainder !== 0) {
      for (let index = 0; index < columns - remainder; index += 1) {
        next.push({ key: `spacer-${index}`, product: null });
      }
    }
    return next;
  }, [products, columns]);

  const handleProductPress = useCallback(
    (product: Product) => {
      if (product.variants.some((variant) => variant.isActive)) {
        setVariantProduct(product);
        return;
      }
      addProduct(product, null);
    },
    [addProduct],
  );

  const selectVariant = useCallback(
    (product: Product, variantId: string | null) => {
      addProduct(product, variantId);
      setVariantProduct(null);
    },
    [addProduct],
  );

  const openCheckout = () => {
    setCartOpen(false);
    router.push("/checkout");
  };

  const openTab = async () => {
    if (lines.length === 0 || createOrderMutation.isPending) return;
    try {
      const order = await createOrderMutation.mutateAsync({
        items: toSaleLines(lines),
        orderType,
        notes,
        promotionCode,
        idempotencyKey: Crypto.randomUUID(),
      });
      clear();
      router.push({ pathname: "/order/[id]", params: { id: order.id } });
    } catch {
      // leave cart intact on failure
    }
  };

  const clearFilters = () => {
    setSearchInput("");
    setCategoryId(null);
  };

  const canSell = session != null && has("sales.create");

  const cartPane = (
    <CartPanel
      lines={lines}
      currency={currency}
      preview={preview}
      settling={settling}
      previewError={previewError}
      onCheckout={openCheckout}
      onClear={clear}
      onOpenTab={has("orders.create") ? openTab : undefined}
      openTabPending={createOrderMutation.isPending}
    />
  );

  if (!canSell) {
    return (
      <Screen>
        <AppHeader title="Sell" subtitle="Point of sale" showAvatar />
        <View style={styles.stateWrap}>
          <ErrorState
            forbidden
            title="Selling is not enabled for your role"
            message="A manager can grant you the sales create permission in the Velora web app."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        title="Sell"
        subtitle={
          outlet ? `${outlet.name} · ${formatQuantity(itemCount)} in cart` : "Point of sale"
        }
        showAvatar
      />

      <View style={styles.controls}>
        <SearchField
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search by name or SKU"
          accessibilityLabel="Search products to sell"
        />

        <View style={styles.filterRow}>
          <SlidersHorizontal size={14} color={colors.inkMuted} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chips}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="All categories"
              accessibilityState={{ selected: categoryId == null }}
              onPress={() => setCategoryId(null)}
              style={[
                styles.chip,
                {
                  backgroundColor: categoryId == null ? colors.primary : colors.surface,
                  borderColor: categoryId == null ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                variant="bodySmall"
                color={categoryId == null ? colors.primaryForeground : colors.inkSecondary}
              >
                All
              </Text>
            </Pressable>

            {categories.map((category) => {
              const active = categoryId === category.id;
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  accessibilityLabel={category.name}
                  accessibilityState={{ selected: active }}
                  onPress={() => setCategoryId(active ? null : category.id)}
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
                    numberOfLines={1}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={[styles.body, wide ? styles.bodyWide : null]}>
        <View style={styles.catalog}>
          {productsQuery.isLoading ? (
            <SkeletonGrid columns={columns} gap={gutter} />
          ) : productsQuery.isError ? (
            <View style={styles.stateWrap}>
              <ErrorState
                message={
                  productsQuery.error instanceof Error
                    ? productsQuery.error.message
                    : "Could not load the catalogue."
                }
                onRetry={() => void productsQuery.refetch()}
              />
            </View>
          ) : products.length === 0 ? (
            <View style={styles.stateWrap}>
              <EmptyState
                icon={PackageSearch}
                title={search || categoryId ? "No matching products" : "No active products"}
                description={
                  search || categoryId
                    ? "Try a different search term or category."
                    : "Add active products in the Velora web app to start selling."
                }
                actionLabel={search || categoryId ? "Clear filters" : undefined}
                onAction={search || categoryId ? clearFilters : undefined}
              />
            </View>
          ) : (
            <FlatList
              key={`grid-${columns}`}
              data={cells}
              numColumns={columns}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) =>
                item.product ? (
                  <RegisterProductTile
                    product={item.product}
                    currency={currency}
                    columns={columns}
                    inCart={inCartByProduct.get(item.product.id) ?? 0}
                    onPress={handleProductPress}
                  />
                ) : (
                  <View style={styles.cell} />
                )
              }
              columnWrapperStyle={{ gap: gutter }}
              contentContainerStyle={[
                styles.grid,
                { gap: gutter, paddingBottom: lines.length > 0 && !wide ? 96 : 24 },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              onEndReachedThreshold={0.35}
              onEndReached={() => {
                if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
                  void productsQuery.fetchNextPage();
                }
              }}
              refreshControl={
                <RefreshControl
                  refreshing={productsQuery.isRefetching && !productsQuery.isFetchingNextPage}
                  onRefresh={() => void productsQuery.refetch()}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                  progressBackgroundColor={colors.surface}
                />
              }
              ListFooterComponent={
                productsQuery.isFetchingNextPage ? (
                  <View style={styles.footer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text variant="caption">Loading more products…</Text>
                  </View>
                ) : (
                  <View style={styles.footerSpace} />
                )
              }
            />
          )}
        </View>

        {wide ? (
          <View
            style={[
              styles.cartPane,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.lg,
              },
            ]}
          >
            <View style={styles.cartPaneHeader}>
              <Text variant="title">Current sale</Text>
              <ShoppingCart size={16} color={colors.inkMuted} />
            </View>
            <ScrollView
              contentContainerStyle={styles.cartPaneContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {cartPane}
            </ScrollView>
          </View>
        ) : null}
      </View>

      {!wide && lines.length > 0 ? (
        <View style={styles.cartBarWrap} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Review cart, ${itemCount} items`}
            onPress={() => setCartOpen(true)}
            style={({ pressed }) => [
              styles.cartBar,
              {
                backgroundColor: colors.ink,
                borderRadius: radii.lg,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <View style={styles.cartBarCount}>
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 13,
                  color: colors.inkInverse,
                }}
              >
                {formatQuantity(itemCount)}
              </Text>
            </View>

            <View style={styles.cartBarText}>
              <Text
                style={{
                  fontFamily: fonts.semibold,
                  fontSize: 14,
                  color: colors.inkInverse,
                }}
              >
                Review sale
              </Text>
              <Text style={{ fontSize: 12, color: colors.inkInverseMuted }}>
                {preview ? formatMoney(preview.total, currency) : "Pricing…"}
              </Text>
            </View>

            <ChevronRight size={18} color={colors.inkInverseMuted} />
          </Pressable>
        </View>
      ) : null}

      <Sheet
        visible={cartOpen}
        onClose={() => setCartOpen(false)}
        title="Current sale"
        description={outlet ? `${outlet.name} · ${formatQuantity(itemCount)} items` : undefined}
      >
        {cartPane}
      </Sheet>

      <VariantSheet
        product={variantProduct}
        currency={currency}
        onSelect={selectVariant}
        onClose={() => setVariantProduct(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: -16,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 190,
  },
  body: {
    flex: 1,
  },
  bodyWide: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
  },
  catalog: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: 16,
  },
  cell: {
    flex: 1,
  },
  skeletonCard: {
    gap: 8,
    minHeight: 150,
  },
  stateWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
  },
  footerSpace: {
    height: 12,
  },
  cartPane: {
    width: 360,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  cartPaneHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  cartPaneContent: {
    paddingBottom: 4,
  },
  cartBarWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 12,
  },
  cartBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 58,
  },
  cartBarCount: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  cartBarText: {
    flex: 1,
    gap: 1,
  },
});
