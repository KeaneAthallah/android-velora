import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { PackageSearch, SlidersHorizontal } from "lucide-react-native";
import { useTheme } from "@/theme";
import { useTenant } from "@/providers/tenant-provider";
import { useResponsive } from "@/lib/use-responsive";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCategories, useInfiniteProducts } from "@/features/products/use-products";
import { ProductCard } from "@/features/products/product-card";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Text } from "@/components/ui/text";
import type { Product } from "@/api/types";

type GridCell = { key: string; product: Product | null };

function SkeletonGrid({
  columns,
  gap,
}: {
  columns: number;
  gap: number;
}) {
  const cells = Array.from({ length: columns * 3 }, (_, index) => index);
  return (
    <FlatList
      data={cells}
      key={`skeleton-${columns}`}
      numColumns={columns}
      scrollEnabled={false}
      keyExtractor={(item) => String(item)}
      columnWrapperStyle={{ gap }}
      contentContainerStyle={{ gap, paddingHorizontal: 16, paddingTop: 4 }}
      renderItem={() => (
        <View style={styles.cell}>
          <Card style={styles.skeletonCard}>
            <Skeleton height={54} radius={10} />
            <Skeleton width="45%" height={10} />
            <Skeleton width="85%" height={13} />
            <Skeleton width="60%" height={13} />
            <Skeleton width="40%" height={12} />
          </Card>
        </View>
      )}
    />
  );
}

export default function ProductsScreen() {
  const { colors } = useTheme();
  const { business, outlet } = useTenant();
  const { gridColumns, gutter } = useResponsive();

  const [searchInput, setSearchInput] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const search = useDebouncedValue(searchInput.trim(), 300);
  const productsQuery = useInfiniteProducts({ search, categoryId });
  const categoriesQuery = useCategories();

  const currency = business?.currency ?? "USD";

  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [productsQuery.data],
  );

  const total = productsQuery.data?.pages[0]?.total ?? 0;

  const filtered = search.length > 0 || categoryId != null;

  const cells = useMemo<GridCell[]>(() => {
    const next: GridCell[] = products.map((product) => ({
      key: product.id,
      product,
    }));
    const remainder = next.length % gridColumns;
    if (remainder !== 0) {
      for (let index = 0; index < gridColumns - remainder; index += 1) {
        next.push({ key: `spacer-${index}`, product: null });
      }
    }
    return next;
  }, [products, gridColumns]);

  const categories = categoriesQuery.data ?? [];

  const subtitle = outlet
    ? `${total} ${total === 1 ? "product" : "products"} · ${outlet.name}`
    : `${total} ${total === 1 ? "product" : "products"}`;

  const clearFilters = () => {
    setSearchInput("");
    setCategoryId(null);
  };

  return (
    <Screen>
      <AppHeader title="Products" subtitle={subtitle} showAvatar />

      <View style={styles.controls}>
        <SearchField
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search by name or SKU"
          accessibilityLabel="Search products"
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
                  backgroundColor:
                    categoryId == null ? colors.primary : colors.surface,
                  borderColor:
                    categoryId == null ? colors.primary : colors.border,
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

      {productsQuery.isLoading ? (
        <SkeletonGrid columns={gridColumns} gap={gutter} />
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
            title={filtered ? "No matching products" : "No products yet"}
            description={
              filtered
                ? "Try a different search term or category."
                : "Add products in the Velora web app and they will appear here."
            }
            actionLabel={filtered ? "Clear filters" : undefined}
            onAction={filtered ? clearFilters : undefined}
          />
        </View>
      ) : (
        <FlatList
          key={`grid-${gridColumns}`}
          data={cells}
          numColumns={gridColumns}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) =>
            item.product ? (
              <ProductCard product={item.product} currency={currency} />
            ) : (
              <View style={styles.cell} />
            )
          }
          columnWrapperStyle={{ gap: gutter }}
          contentContainerStyle={[styles.grid, { gap: gutter }]}
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
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  cell: {
    flex: 1,
  },
  skeletonCard: {
    gap: 8,
    minHeight: 190,
    justifyContent: "flex-start",
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
});
