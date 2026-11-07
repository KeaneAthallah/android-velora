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
import {
  useCategories,
  useCreateProductMutation,
  useInfiniteProducts,
} from "@/features/products/use-products";
import { ProductCard } from "@/features/products/product-card";
import { useAuth } from "@/providers/auth-provider";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
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

  const { has } = useAuth();
  const canManage = has("products.manage");

  const [searchInput, setSearchInput] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const createMutation = useCreateProductMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftSku, setDraftSku] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftCost, setDraftCost] = useState("");
  const [draftUnit, setDraftUnit] = useState("pcs");
  const [draftCategoryId, setDraftCategoryId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

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

  /**
   * SKU is required by the API but meaningless to a cashier, so derive one from
   * the name when it is left blank. A short random tail keeps two "Kopi Susu"
   * rows from colliding on the unique index.
   */
  const deriveSku = (value: string) => {
    const base = value
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20);
    const tail = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `${base || "ITEM"}-${tail}`;
  };

  const submitCreate = async () => {
    if (draftName.trim().length < 2) {
      setCreateError("Product name is required.");
      return;
    }

    setCreateError(null);
    try {
      await createMutation.mutateAsync({
        name: draftName.trim(),
        sku: draftSku.trim() || deriveSku(draftName.trim()),
        sellingPrice: draftPrice.trim() || "0",
        costPrice: draftCost.trim() || undefined,
        unit: draftUnit.trim() || undefined,
        categoryId: draftCategoryId,
      });
      setCreateOpen(false);
      setDraftName("");
      setDraftSku("");
      setDraftPrice("");
      setDraftCost("");
      setDraftUnit("pcs");
      setDraftCategoryId(null);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not create the product.");
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Products"
        subtitle={subtitle}
        showAvatar
        right={
          canManage ? (
            <Button
              label="New"
              size="sm"
              onPress={() => {
                setCreateError(null);
                setCreateOpen(true);
              }}
            />
          ) : undefined
        }
      />

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
                : "Add your first product to start selling it on the register."
            }
            actionLabel={
              filtered ? "Clear filters" : canManage ? "Add product" : undefined
            }
            onAction={
              filtered
                ? clearFilters
                : canManage
                  ? () => {
                      setCreateError(null);
                      setCreateOpen(true);
                    }
                  : undefined
            }
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

      <Sheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New product"
        description="Selling price is what the register charges."
      >
        <View style={styles.form}>
          <TextField
            label="Name"
            value={draftName}
            onChangeText={setDraftName}
            placeholder="Kopi Susu Gula Aren"
          />
          <TextField
            label="SKU"
            value={draftSku}
            onChangeText={setDraftSku}
            placeholder="Auto-generated if left blank"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TextField
            label={`Selling price (${currency})`}
            value={draftPrice}
            onChangeText={setDraftPrice}
            placeholder="22000"
            keyboardType="numeric"
          />
          <TextField
            label={`Cost price (${currency})`}
            value={draftCost}
            onChangeText={setDraftCost}
            placeholder="9000"
            keyboardType="numeric"
          />
          <TextField
            label="Unit"
            value={draftUnit}
            onChangeText={setDraftUnit}
            placeholder="pcs"
            autoCapitalize="none"
          />

          {categories.length > 0 ? (
            <View style={styles.formChips}>
              <Text variant="label">Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.chips}
              >
                {categories.map((category) => {
                  const active = draftCategoryId === category.id;
                  return (
                    <Pressable
                      key={category.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Category ${category.name}`}
                      accessibilityState={{ selected: active }}
                      onPress={() =>
                        setDraftCategoryId(active ? null : category.id)
                      }
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active
                            ? colors.primary
                            : colors.surfaceMuted,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        variant="bodySmall"
                        color={
                          active ? colors.primaryForeground : colors.inkSecondary
                        }
                        numberOfLines={1}
                      >
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {createError ? (
            <Text variant="caption" color={colors.danger}>
              {createError}
            </Text>
          ) : null}

          <Button
            label={createMutation.isPending ? "Saving…" : "Create product"}
            onPress={() => void submitCreate()}
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
            fullWidth
          />
        </View>
      </Sheet>
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
  form: {
    gap: 12,
    paddingBottom: 8,
  },
  formChips: {
    gap: 8,
  },
});
