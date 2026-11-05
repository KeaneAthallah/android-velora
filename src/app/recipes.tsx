import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { ChefHat } from "lucide-react-native";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTheme } from "@/theme";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { useRecipes } from "@/features/recipes/use-recipes";
import { formatMoney, formatQuantity } from "@/lib/format";
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
import type { RecipeProduct } from "@/api/types";

function marginPercent(recipe: RecipeProduct) {
  const selling = Number(recipe.sellingPrice);
  const cost = Number(recipe.recipeCost);
  if (!selling || !Number.isFinite(selling)) return 0;
  return ((selling - cost) / selling) * 100;
}

export default function RecipesScreen() {
  const { colors } = useTheme();
  const { has } = usePermissions();
  const { business } = useTenant();
  const recipesQuery = useRecipes();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim().toLowerCase(), 250);
  const [detail, setDetail] = useState<RecipeProduct | null>(null);

  const currency = business?.currency ?? "USD";

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

  if (!has("recipes.view")) {
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

  return (
    <Screen>
      <AppHeader
        title="Recipes"
        subtitle={`${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"}`}
        showBack
      />

      <View style={styles.controls}>
        <SearchField
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search product or SKU"
          accessibilityLabel="Search recipes"
        />
      </View>

      {recipesQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} height={84} radius={12} />
          ))}
        </View>
      ) : recipesQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            message={
              recipesQuery.error instanceof Error
                ? recipesQuery.error.message
                : "Could not load recipes."
            }
            onRetry={() => void recipesQuery.refetch()}
          />
        </View>
      ) : recipes.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState
            icon={ChefHat}
            title={search ? "No matching recipes" : "No recipes yet"}
            description={
              search
                ? "Try a different product name or SKU."
                : "Products with a bill of materials on the web app appear here with their costing."
            }
            actionLabel={search ? "Clear search" : undefined}
            onAction={search ? () => setSearchInput("") : undefined}
          />
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(recipe) => recipe.productId}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={recipesQuery.isRefetching && !recipesQuery.isLoading}
              onRefresh={() => void recipesQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          renderItem={({ item }) => {
            const margin = marginPercent(item);
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
                <Text variant="title">
                  {formatMoney(detail.recipeCost, currency)}
                </Text>
              </Card>
              <Card style={styles.summaryCard}>
                <Text variant="label">Selling price</Text>
                <Text variant="title">
                  {formatMoney(detail.sellingPrice, currency)}
                </Text>
              </Card>
            </View>

            <Text variant="caption">
              Margin {marginPercent(detail).toFixed(1)}% on the current cost —
              recomputed by the server from the cost per unit of each ingredient.
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
                        {formatMoney(line.unitCost, currency)}/
                        {line.unit || "unit"}
                      </Text>
                    </View>
                    <Text variant="bodySmall">
                      {formatMoney(line.lineCost, currency)}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>

            <Text variant="caption">
              Editing a recipe needs the web app — this view is for checking cost
              and yield on the floor.
            </Text>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingBottom: 12 },
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
  lines: { paddingVertical: 2 },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  lineText: { flex: 1, gap: 1 },
});
