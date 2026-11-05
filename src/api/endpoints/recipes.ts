import { apiRequest } from "@/api/client";
import type { RecipeLine, RecipeProduct } from "@/api/types";

type RawLine = {
  id?: string | number | null;
  ingredient_id: number | string;
  ingredient_name?: string | null;
  unit?: string | null;
  unit_cost?: string | number | null;
  quantity?: string | number | null;
  line_cost?: string | number | null;
};

type RawRecipeProduct = {
  id: number | string;
  name: string;
  sku?: string | null;
  selling_price?: string | number | null;
  recipe_cost?: string | number | null;
  recipe_items?: RawLine[];
};

function mapLine(raw: RawLine): RecipeLine {
  return {
    id: raw.id == null ? null : String(raw.id),
    ingredientId: String(raw.ingredient_id),
    ingredientName: raw.ingredient_name ?? "Ingredient",
    unit: raw.unit ?? "",
    quantity: String(raw.quantity ?? "0"),
    unitCost: String(raw.unit_cost ?? "0"),
    lineCost: String(raw.line_cost ?? "0"),
  };
}

/**
 * `GET /recipes?with_recipe=1` — needs `recipes.view`. Returns only products
 * that have a bill of materials, each with its lines and recipe cost.
 */
export async function fetchRecipes(): Promise<RecipeProduct[]> {
  const data = await apiRequest<RawRecipeProduct[]>("/recipes", {
    params: { with_recipe: 1 },
  });

  return (Array.isArray(data) ? data : []).map((raw) => ({
    productId: String(raw.id),
    name: raw.name,
    sku: raw.sku ?? "",
    sellingPrice: String(raw.selling_price ?? "0"),
    recipeCost: String(raw.recipe_cost ?? "0"),
    lines: (raw.recipe_items ?? []).map(mapLine),
  }));
}
