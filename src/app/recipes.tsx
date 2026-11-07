import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { ChefHat } from "lucide-react-native";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTheme } from "@/theme";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { useRecipes } from "@/features/recipes/use-recipes";
import { useIngredientMovements } from "@/features/recipes/use-ingredient-movements";
import { useIngredientUsage } from "@/features/recipes/use-ingredient-usage";
import { useRecipeAvailability } from "@/features/recipes/use-recipe-availability";
import { formatDateTime, formatMoney, formatQuantity } from "@/lib/format";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import type { IngredientUsage, ProductAvailability, RecipeProduct } from "@/api/types";

type Mode = "recipes" | "ingredients";

function marginPercent(recipe: RecipeProduct) {
  const selling = Number(recipe.sellingPrice);
  const cost = Number(recipe.recipeCost);
  if (!selling || !Number.isFinite(selling)) return 0;
  return ((selling - cost) / selling) * 100;
}

function availabilityTone(availability: ProductAvailability) {
  if (availability.status === "out_of_stock") return "danger" as const;
  if (availability.status === "low_stock") return "warning" as const;
  return "success" as const;
}

function sellableLabel(availability: ProductAvailability) {
  if (availability.unlimited) return "No ingredient limit";
  return `${availability.sellable ?? 0} sellable now`;
}

const MOVEMENT_LABEL: Record<string, string> = {
  adjustment: "Adjustment",
  purchase: "Purchase",
  consumption: "Sale",
  void: "Void",
  wastage: "Wastage",
  expired: "Expired",
};

function movementTone(type: string) {
  if (type === "purchase") return "success" as const;
  if (type === "void") return "warning" as const;
  if (type === "wastage" || type === "expired") return "danger" as const;
  return "neutral" as const;
}

export default function RecipesScreen() {
  const { colors, radii } = useTheme();
  const { has } = usePermissions();
  const { business } = useTenant();
  const recipesQuery = useRecipes();
  const usageQuery = useIngredientUsage();
  const availabilityQuery = useRecipeAvailability();

  const [mode, setMode] = useState<Mode>("recipes");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim().toLowerCase(), 250);
  const [detail, setDetail] = useState<RecipeProduct | null>(null);
  const [ingredientDetail, setIngredientDetail] = useState<IngredientUsage | null>(null);
  const movementsQuery = useIngredientMovements(ingredientDetail?.ingredientId ?? null);
  const movements = movementsQuery.data ?? [];

  const currency = business?.currency ?? "USD";

  const availabilityByProduct = useMemo(() => {
    const map = new Map<string, ProductAvailability>();
    for (const row of availabilityQuery.data ?? []) map.set(row.productId, row);
    return map;
  }, [availabilityQuery.data]);

  const recipes = useMemo(() => {
    const rows = recipesQuery.data ?? [];
    const filtered = search
      ? rows.filter(
          (recipe) =>
            recipe.name.toLowerCase().includes(search) ||
            recipe.sku.toLowerCase().includes(search),
        )
      : rows;

    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [recipesQuery.data, search]);

  const ingredients = useMemo(() => {
    const rows = usageQuery.data ?? [];
    const filtered = search
      ? rows.filter(
          (row) =>
            row.name.toLowerCase().includes(search) ||
            row.sku.toLowerCase().includes(search),
        )
      : rows;

    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [usageQuery.data, search]);

  if (!has("recipes.view") && !has("ingredients.view")) {
    return (
      <Screen>
        <AppHeader title="Recipes" subtitle="Ingredients and yield" showBack />
        <View style={styles.stateWrap}>
          <ErrorState
            forbidden
            title="Recipes not enabled for your role"
            message="A manager can grant recipes view."
          />
        </View>
      </Screen>
    );
  }

  const activeQuery = mode === "recipes" ? recipesQuery : usageQuery;
  const count = mode === "recipes" ? recipes.length : ingredients.length;
  const noun = mode === "recipes" ? "recipe" : "ingredient";

  const refresh = () => {
    void (mode === "recipes" ? recipesQuery.refetch() : usageQuery.refetch());
    void availabilityQuery.refetch();
  };

  return (
    <Screen>
      <AppHeader
        title="Recipes"
        subtitle={`${count} ${count === 1 ? noun : `${noun}s`}`}
        showBack
      />

      <View style={styles.controls}>
        <View
          style={[
            styles.segment,
            { backgroundColor: colors.surfaceMuted, borderRadius: radii.full },
          ]}
        >
          {(["recipes", "ingredients"] as const).map((key) => {
            const active = mode === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setMode(key)}
                style={[
                  styles.segmentItem,
                  {
                    backgroundColor: active ? colors.surface : "transparent",
                    borderRadius: radii.full,
                  },
                ]}
              >
                <Text variant="bodySmall" color={active ? colors.ink : colors.inkSecondary}>
                  {key === "recipes" ? "Recipes" : "Ingredients"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SearchField
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder={mode === "recipes" ? "Search product or SKU" : "Search ingredient or SKU"}
          accessibilityLabel={mode === "recipes" ? "Search recipes" : "Search ingredients"}
        />
      </View>

      {activeQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} height={84} radius={12} />
          ))}
        </View>
      ) : activeQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            message={
              activeQuery.error instanceof Error
                ? activeQuery.error.message
                : "Could not load recipes."
            }
            onRetry={() => void activeQuery.refetch()}
          />
        </View>
      ) : count === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState
            icon={ChefHat}
            title={
              search
                ? "No matches"
                : mode === "recipes"
                  ? "No recipes yet"
                  : "No ingredients yet"
            }
            description={
              search
                ? "Try a different name or SKU."
                : mode === "recipes"
                  ? "Products with a bill of materials on the web app appear here with their costing."
                  : "Ingredients created on the web app appear here with the stock left at this outlet."
            }
            actionLabel={search ? "Clear search" : undefined}
            onAction={search ? () => setSearchInput("") : undefined}
          />
        </View>
      ) : mode === "recipes" ? (
        <FlatList
          data={recipes}
          keyExtractor={(recipe) => recipe.productId}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={activeQuery.isRefetching && !activeQuery.isLoading}
              onRefresh={refresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          renderItem={({ item }) => {
            const margin = marginPercent(item);
            const availability = availabilityByProduct.get(item.productId);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open recipe for ${item.name}`}
                onPress={() => setDetail(item)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <Card style={styles.row}>
                  <View style={styles.rowTop}>
                    <Text variant="body" numberOfLines={1} style={styles.rowName}>
                      {item.name}
                    </Text>
                    <Badge
                      label={`${margin.toFixed(0)}% margin`}
                      tone={margin >= 50 ? "success" : margin >= 20 ? "warning" : "danger"}
                    />
                  </View>
                  <Text variant="caption" numberOfLines={1}>
                    {item.sku || "No SKU"} · {item.lines.length}{" "}
                    {item.lines.length === 1 ? "ingredient" : "ingredients"}
                    {availability && !availability.unlimited
                      ? ` · ${availability.sellable ?? 0} left`
                      : ""}
                  </Text>
                  <View style={styles.rowBottom}>
                    <Text variant="caption" color={colors.inkSecondary}>
                      Cost {formatMoney(item.recipeCost, currency)}
                    </Text>
                    <Text variant="bodySmall">
                      Sells {formatMoney(item.sellingPrice, currency)}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
      ) : (
        <FlatList
          data={ingredients}
          keyExtractor={(row) => row.ingredientId}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={activeQuery.isRefetching && !activeQuery.isLoading}
              onRefresh={refresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ingredient ${item.name}`}
              onPress={() => setIngredientDetail(item)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Card style={styles.row}>
                <View style={styles.rowTop}>
                  <Text variant="body" numberOfLines={1} style={styles.rowName}>
                    {item.name}
                  </Text>
                  {item.lowStock ? <Badge label="Low" tone="warning" /> : null}
                </View>
                <Text variant="caption" numberOfLines={1}>
                  {item.sku || "No SKU"} · {item.products.length}{" "}
                  {item.products.length === 1 ? "product" : "products"}
                </Text>
                <View style={styles.rowBottom}>
                  <Text variant="caption" color={colors.inkSecondary}>
                    Left {formatQuantity(item.remaining)} {item.unit}
                  </Text>
                  <Text variant="bodySmall">
                    Used {formatQuantity(item.consumed)} {item.unit}
                  </Text>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}

      <Sheet
        visible={detail != null}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ""}
        description={detail ? `Bill of materials · ${detail.sku || "no SKU"}` : undefined}
      >
        {detail ? (
          <View style={styles.sheetBody}>
            <View style={styles.summary}>
              <Card style={styles.summaryCard}>
                <Text variant="label">Recipe cost</Text>
                <Text variant="title">{formatMoney(detail.recipeCost, currency)}</Text>
              </Card>
              <Card style={styles.summaryCard}>
                <Text variant="label">Selling price</Text>
                <Text variant="title">{formatMoney(detail.sellingPrice, currency)}</Text>
              </Card>
            </View>

            {availabilityByProduct.get(detail.productId) ? (
              <Card style={styles.availabilityCard}>
                <View style={styles.rowTop}>
                  <Text variant="bodySmall">Stock availability</Text>
                  <Badge
                    label={
                      availabilityByProduct.get(detail.productId)!.status === "out_of_stock"
                        ? "Out"
                        : availabilityByProduct.get(detail.productId)!.unlimited
                          ? "Open"
                          : "Tracked"
                    }
                    tone={availabilityTone(availabilityByProduct.get(detail.productId)!)}
                  />
                </View>
                <Text variant="body">
                  {sellableLabel(availabilityByProduct.get(detail.productId)!)}
                </Text>
                {availabilityByProduct.get(detail.productId)!.limiting ? (
                  <Text variant="caption">
                    Limited by{" "}
                    {availabilityByProduct.get(detail.productId)!.limiting!.ingredientName} (
                    {formatQuantity(
                      availabilityByProduct.get(detail.productId)!.limiting!.available,
                    )}{" "}
                    {availabilityByProduct.get(detail.productId)!.limiting!.unit} left)
                  </Text>
                ) : null}
              </Card>
            ) : null}

            <Text variant="caption">
              Margin {marginPercent(detail).toFixed(1)}% on the current cost — recomputed by the
              server from the cost per unit of each ingredient.
            </Text>

            <Card padded={false} style={styles.lines}>
              {detail.lines.map((line, index) => (
                <View key={line.id ?? line.ingredientId}>
                  {index > 0 ? <Divider /> : null}
                  <View style={styles.lineRow}>
                    <View style={styles.lineText}>
                      <Text variant="bodySmall" numberOfLines={1}>
                        {line.ingredientName}
                      </Text>
                      <Text variant="caption">
                        {formatQuantity(line.quantity)} {line.unit} ·{" "}
                        {formatMoney(line.unitCost, currency)}/{line.unit || "unit"}
                      </Text>
                    </View>
                    <Text variant="bodySmall">{formatMoney(line.lineCost, currency)}</Text>
                  </View>
                </View>
              ))}
            </Card>

            <Text variant="caption">
              Editing a recipe needs the web app — this view is for checking cost, yield and
              what the outlet can still make.
            </Text>
          </View>
        ) : null}
      </Sheet>

      <Sheet
        visible={ingredientDetail != null}
        onClose={() => setIngredientDetail(null)}
        title={ingredientDetail?.name ?? ""}
        description={
          ingredientDetail
            ? `Stock at this outlet · ${ingredientDetail.sku || "no SKU"}`
            : undefined
        }
      >
        {ingredientDetail ? (
          <View style={styles.sheetBody}>
            <View style={styles.summary}>
              <Card style={styles.summaryCard}>
                <Text variant="label">Remaining</Text>
                <Text variant="title">
                  {formatQuantity(ingredientDetail.remaining)} {ingredientDetail.unit}
                </Text>
              </Card>
              <Card style={styles.summaryCard}>
                <Text variant="label">Used</Text>
                <Text variant="title">
                  {formatQuantity(ingredientDetail.consumed)} {ingredientDetail.unit}
                </Text>
              </Card>
            </View>

            {ingredientDetail.lowStock ? (
              <Text variant="caption" color={colors.warning}>
                At or below the reorder level of{" "}
                {formatQuantity(ingredientDetail.reorderLevel)} {ingredientDetail.unit}.
              </Text>
            ) : null}

            <Text variant="label">
              {ingredientDetail.products.length === 0
                ? "Not used by any product"
                : `Used by ${ingredientDetail.products.length} ${
                    ingredientDetail.products.length === 1 ? "product" : "products"
                  }`}
            </Text>

            {ingredientDetail.products.length > 0 ? (
              <Card padded={false} style={styles.lines}>
                {ingredientDetail.products.map((usage, index) => (
                  <View key={`${usage.productId}:${usage.productVariantId ?? "base"}`}>
                    {index > 0 ? <Divider /> : null}
                    <View style={styles.lineRow}>
                      <View style={styles.lineText}>
                        <Text variant="bodySmall" numberOfLines={1}>
                          {usage.productName ?? "Product"}
                          {usage.productVariantId ? " (variant)" : ""}
                        </Text>
                        <Text variant="caption">
                          {formatQuantity(usage.quantity)} {usage.unit} per unit ·{" "}
                          {formatQuantity(usage.quantityInIngredientUnit)}{" "}
                          {ingredientDetail.unit}
                        </Text>
                      </View>
                      <Badge
                        label={
                          usage.producible == null ? "—" : `${usage.producible} left`
                        }
                        tone={
                          usage.producible != null && usage.producible <= 0
                            ? "danger"
                            : usage.producible != null && usage.producible <= 5
                              ? "warning"
                              : "neutral"
                        }
                      />
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}

            <Text variant="caption">
              One balance per ingredient across every product; the left counts use the
              current recipe for each product.
            </Text>

            <Text variant="label">Recent movements</Text>
            {movementsQuery.isLoading ? (
              <Skeleton height={72} radius={12} />
            ) : movements.length === 0 ? (
              <Text variant="caption">
                No stock changes recorded for this ingredient at this outlet yet.
              </Text>
            ) : (
              <Card padded={false} style={styles.lines}>
                {movements.slice(0, 8).map((movement, index) => (
                  <View key={movement.id}>
                    {index > 0 ? <Divider /> : null}
                    <View style={styles.lineRow}>
                      <View style={styles.lineText}>
                        <View style={styles.movementHead}>
                          <Badge
                            label={MOVEMENT_LABEL[movement.type] ?? movement.type}
                            tone={movementTone(movement.type)}
                          />
                          <Text variant="caption">
                            {formatDateTime(movement.createdAt)}
                          </Text>
                        </View>
                        <Text variant="caption" numberOfLines={1}>
                          {movement.reason ?? "—"}
                          {movement.actorName ? ` · ${movement.actorName}` : ""}
                        </Text>
                      </View>
                      <View style={styles.movementValue}>
                        <Text variant="bodySmall">
                          {Number(movement.quantity) > 0 ? "+" : ""}
                          {formatQuantity(movement.quantity)} {ingredientDetail.unit}
                        </Text>
                        <Text variant="caption">
                          balance {formatQuantity(movement.balanceAfter)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Card>
            )}

            <Text variant="caption">
              Movements include purchases, sale deductions, voids, wastage and manual
              adjustments; the newest are listed first.
            </Text>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  segment: { flexDirection: "row", padding: 3, gap: 3 },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 7 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  row: { gap: 6 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowName: { flex: 1 },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  skeletonWrap: { paddingHorizontal: 16, gap: 10 },
  sheetBody: { gap: 12, paddingBottom: 8 },
  summary: { flexDirection: "row", gap: 10 },
  summaryCard: { flex: 1, gap: 4 },
  availabilityCard: { gap: 6 },
  lines: { paddingVertical: 2 },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  lineText: { flex: 1, gap: 1 },
  movementHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  movementValue: { alignItems: "flex-end", gap: 1 },
});
