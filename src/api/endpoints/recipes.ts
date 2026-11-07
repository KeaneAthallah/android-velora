import { apiRequest } from "@/api/client";
import type {
  AvailabilityLine,
  IngredientStockMovement,
  IngredientUsage,
  IngredientUsageProduct,
  Paginated,
  ProductAvailability,
  RecipeLine,
  RecipeProduct,
} from "@/api/types";

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

type RawUsageProduct = {
  product_id: string | number;
  product_name?: string | null;
  product_variant_id?: string | number | null;
  quantity?: string | number | null;
  unit?: string | null;
  quantity_in_ingredient_unit?: string | number | null;
  producible?: number | null;
};

type RawUsage = {
  ingredient_id: string | number;
  name: string;
  sku?: string | null;
  unit?: string | null;
  remaining?: string | number | null;
  consumed?: string | number | null;
  received?: string | number | null;
  reorder_level?: string | number | null;
  low_stock?: boolean;
  track_inventory?: boolean;
  products?: RawUsageProduct[];
};

function mapUsageProduct(raw: RawUsageProduct): IngredientUsageProduct {
  return {
    productId: String(raw.product_id),
    productName: raw.product_name ?? null,
    productVariantId: raw.product_variant_id == null ? null : String(raw.product_variant_id),
    quantity: String(raw.quantity ?? "0"),
    unit: raw.unit ?? "",
    quantityInIngredientUnit: String(raw.quantity_in_ingredient_unit ?? "0"),
    producible: raw.producible ?? null,
  };
}

/**
 * `GET /ingredients/dashboard` — needs `ingredients.view` plus an outlet.
 * Remaining/consumed stock per ingredient and the products made from it.
 */
export async function fetchIngredientUsage(outletId: string): Promise<IngredientUsage[]> {
  const data = await apiRequest<RawUsage[]>("/ingredients/dashboard", {
    params: { outlet_id: outletId },
  });

  return (Array.isArray(data) ? data : []).map((raw) => ({
    ingredientId: String(raw.ingredient_id),
    name: raw.name,
    sku: raw.sku ?? "",
    unit: raw.unit ?? "",
    remaining: String(raw.remaining ?? "0"),
    consumed: String(raw.consumed ?? "0"),
    received: String(raw.received ?? "0"),
    reorderLevel: String(raw.reorder_level ?? "0"),
    lowStock: Boolean(raw.low_stock),
    trackInventory: raw.track_inventory !== false,
    products: (raw.products ?? []).map(mapUsageProduct),
  }));
}

type RawMovement = {
  id: string | number;
  ingredient_id: string | number;
  type?: string | null;
  quantity?: string | number | null;
  balance_after?: string | number | null;
  reference_type?: string | null;
  reference_id?: string | number | null;
  reason?: string | null;
  actor?: { name?: string | null } | null;
  created_at?: string | null;
};

/**
 * `GET /ingredient-movements` — every stock change for one ingredient at the
 * outlet, newest first. Needs `ingredients.view`.
 */
export async function fetchIngredientMovements(
  ingredientId: string,
  outletId: string,
): Promise<IngredientStockMovement[]> {
  const page = await apiRequest<Paginated<RawMovement>>("/ingredient-movements", {
    params: { ingredient_id: ingredientId, outlet_id: outletId },
  });

  return (page.data ?? []).map((raw) => ({
    id: String(raw.id),
    ingredientId: String(raw.ingredient_id),
    type: raw.type ?? "adjustment",
    quantity: String(raw.quantity ?? "0"),
    balanceAfter: String(raw.balance_after ?? "0"),
    referenceType: raw.reference_type ?? null,
    referenceId: raw.reference_id == null ? null : String(raw.reference_id),
    reason: raw.reason ?? null,
    actorName: raw.actor?.name ?? null,
    createdAt: raw.created_at ?? "",
  }));
}

type RawAvailabilityLine = {
  ingredient_id: string | number;
  ingredient_name: string;
  unit?: string | null;
  available?: string | number | null;
  required_per_unit?: string | number | null;
  reorder_level?: string | number | null;
  possible?: number | null;
};

type RawAvailability = {
  product_id: string | number;
  product_name: string;
  sellable?: number | null;
  unlimited?: boolean;
  status?: string | null;
  limiting?: RawAvailabilityLine | null;
};

function mapAvailabilityLine(raw: RawAvailabilityLine): AvailabilityLine {
  return {
    ingredientId: String(raw.ingredient_id),
    ingredientName: raw.ingredient_name,
    unit: raw.unit ?? "",
    available: String(raw.available ?? "0"),
    requiredPerUnit: String(raw.required_per_unit ?? "0"),
    reorderLevel: String(raw.reorder_level ?? "0"),
    possible: raw.possible ?? 0,
  };
}

/**
 * `GET /recipes/availability` — sellable counts for the whole menu in one call,
 * so the register can grey out items without a request per tile.
 */
export async function fetchAvailability(outletId: string): Promise<ProductAvailability[]> {
  const data = await apiRequest<RawAvailability[]>("/recipes/availability", {
    params: { outlet_id: outletId },
  });

  return (Array.isArray(data) ? data : []).map((raw) => ({
    productId: String(raw.product_id),
    productName: raw.product_name,
    sellable: raw.sellable ?? null,
    unlimited: Boolean(raw.unlimited),
    status:
      raw.status === "out_of_stock" || raw.status === "low_stock"
        ? raw.status
        : "available",
    limiting: raw.limiting ? mapAvailabilityLine(raw.limiting) : null,
  }));
}
