import { apiRequest } from "@/api/client";
import type {
  ReorderConsumption,
  ReorderForecast,
  ReorderIngredient,
  ReorderIngredientForecast,
  ReorderMethod,
  ReorderParcel,
  ReorderParcelPreview,
  ReorderPhotoPattern,
  ReorderWasteRisk,
} from "@/api/types";

export type ReorderModelFlags = {
  demand?: boolean;
  shelfLife?: boolean;
  leadTime?: boolean;
};

export type ReorderForecastParams = {
  /** Start of the historical lookback; the API defaults to 14 days ago. */
  from?: string;
  until?: string;
  /** Lead time used when an ingredient has none of its own. */
  defaultLeadDays?: number;
  /** Days of cover kept on top of the lead time. */
  minCoverageDays?: number;
  forecastAt?: string;
  models?: ReorderModelFlags;
};

function pick(raw: Record<string, unknown>, camel: string, snake: string): unknown {
  return raw[camel] ?? raw[snake];
}

/** Money and quantities stay strings — the server owns the arithmetic. */
function quantity(value: unknown): string {
  if (value === null || value === undefined || value === "") return "0";
  return String(value);
}

function optionalQuantity(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function wholeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapWasteRisk(raw: unknown): ReorderWasteRisk | null {
  if (!raw) return null;
  const row = raw as Record<string, unknown>;
  return {
    likelyWasteQuantity: quantity(
      pick(row, "likelyWasteQuantity", "likely_waste_quantity"),
    ),
    note: String(row.note ?? ""),
  };
}

function mapParcelPreview(raw: unknown): ReorderParcelPreview | null {
  if (!raw) return null;
  const row = raw as Record<string, unknown>;
  return {
    leadTimeDays: wholeNumber(pick(row, "leadTimeDays", "lead_time_days")),
    leadTimeDemand: quantity(pick(row, "leadTimeDemand", "lead_time_demand")),
    targetStock: quantity(pick(row, "targetStock", "target_stock")),
    reorderQuantity: quantity(pick(row, "reorderQuantity", "reorder_quantity")),
    predictedStockAtReorderDate: quantity(
      pick(row, "predictedStockAtReorderDate", "predicted_stock_at_reorder_date"),
    ),
    parcelsRequired: optionalNumber(pick(row, "parcelsRequired", "parcels_required")),
    totalCost: optionalQuantity(pick(row, "totalCost", "total_cost")),
    leftoverStock: optionalQuantity(pick(row, "leftoverStock", "leftover_stock")),
  };
}

function mapParcel(raw: Record<string, unknown>): ReorderParcel {
  return {
    parcelQuantity: quantity(pick(raw, "parcelQuantity", "parcel_quantity")),
    parcelCost: quantity(pick(raw, "parcelCost", "parcel_cost")),
    unitCost: optionalQuantity(pick(raw, "unitCost", "unit_cost")),
    supplierId: String(pick(raw, "supplierId", "supplier_id") ?? ""),
    supplierName: (pick(raw, "supplierName", "supplier_name") as string | null) ?? null,
    supplierLeadTimeDays: optionalNumber(
      pick(raw, "supplierLeadTimeDays", "supplier_lead_time_days"),
    ),
    preview: mapParcelPreview(raw.preview),
  };
}

function mapPhotoPattern(raw: unknown): ReorderPhotoPattern | null {
  if (!raw) return null;
  const row = raw as Record<string, unknown>;
  const parcels = pick(row, "suggestedParcels", "suggested_parcels");
  return {
    patternId: String(pick(row, "patternId", "pattern_id") ?? ""),
    name: String(row.name ?? ""),
    consumptionRate: quantity(pick(row, "consumptionRate", "consumption_rate")),
    photoShareEstimate: quantity(pick(row, "photoShareEstimate", "photo_share_estimate")),
    suggestedParcels: (Array.isArray(parcels) ? parcels : []).map((parcel) =>
      mapParcel(parcel as Record<string, unknown>),
    ),
  };
}

function mapForecast(raw: Record<string, unknown>): ReorderIngredientForecast {
  const method = (raw.method as ReorderMethod | undefined) ?? "none";
  return {
    method: method === "recipe-demand" || method === "photo-demand" ? method : "none",
    dailyDemand: quantity(pick(raw, "dailyDemand", "daily_demand")),
    leadTimeDemand: quantity(pick(raw, "leadTimeDemand", "lead_time_demand")),
    targetStock: optionalQuantity(pick(raw, "targetStock", "target_stock")),
    currentStock: quantity(pick(raw, "currentStock", "current_stock")),
    reorderQuantity: quantity(pick(raw, "reorderQuantity", "reorder_quantity")),
    reorderQuantityUnit: String(
      pick(raw, "reorderQuantityUnit", "reorder_quantity_unit") ?? "",
    ),
    reorderReason: String(pick(raw, "reorderReason", "reorder_reason") ?? ""),
    predictedStockAtReorderDate: quantity(
      pick(raw, "predictedStockAtReorderDate", "predicted_stock_at_reorder_date"),
    ),
    daysOfStockRemaining: optionalQuantity(
      pick(raw, "daysOfStockRemaining", "days_of_stock_remaining"),
    ),
    wasteRisk: mapWasteRisk(pick(raw, "wasteRisk", "waste_risk")),
    blindSpot: (pick(raw, "blindSpot", "blind_spot") as string | null) ?? null,
    shelfLifeNote: (pick(raw, "shelfLifeNote", "shelf_life_note") as string | null) ?? null,
    leadTimeDays: optionalNumber(pick(raw, "leadTimeDays", "lead_time_days")),
  };
}

function mapConsumption(raw: Record<string, unknown> | undefined): ReorderConsumption {
  return {
    theoretical: quantity(raw?.theoretical),
    soldUnits: wholeNumber(pick(raw ?? {}, "soldUnits", "sold_units")),
    recipeDriven: Boolean(pick(raw ?? {}, "recipeDriven", "recipe_driven")),
  };
}

function mapIngredient(raw: Record<string, unknown>): ReorderIngredient {
  const parcels = pick(raw, "suggestedParcels", "suggested_parcels");
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    sku: String(raw.sku ?? ""),
    unit: String(raw.unit ?? ""),
    costPerUnit: quantity(pick(raw, "costPerUnit", "cost_per_unit")),
    currentStock: quantity(pick(raw, "currentStock", "current_stock")),
    reorderLevel: quantity(pick(raw, "reorderLevel", "reorder_level")),
    shelfLifeDays: wholeNumber(pick(raw, "shelfLifeDays", "shelf_life_days")),
    isTracked: Boolean(pick(raw, "isTracked", "is_tracked")),
    leadTimeDays: wholeNumber(pick(raw, "leadTimeDays", "lead_time_days")),
    photoPattern: mapPhotoPattern(pick(raw, "photoPattern", "photo_pattern")),
    suggestedParcels: (Array.isArray(parcels) ? parcels : []).map((parcel) =>
      mapParcel(parcel as Record<string, unknown>),
    ),
    forecast: mapForecast((raw.forecast as Record<string, unknown> | undefined) ?? {}),
    consumption: mapConsumption(raw.consumption as Record<string, unknown> | undefined),
  };
}

function forecastParams(params: ReorderForecastParams) {
  const query: Record<string, string | number> = {};
  if (params.from) query.from = params.from;
  if (params.until) query.until = params.until;
  if (params.defaultLeadDays !== undefined) {
    query.defaultLeadDays = params.defaultLeadDays;
  }
  if (params.minCoverageDays !== undefined) {
    query.minCoverageDays = params.minCoverageDays;
  }
  if (params.forecastAt) query.forecastAt = params.forecastAt;
  // The active outlet travels in the X-Outlet-Id header, not the query.
  for (const [key, value] of Object.entries(params.models ?? {})) {
    if (value === undefined) continue;
    query[`models[${key}]`] = value ? 1 : 0;
  }
  return query;
}

/**
 * `GET /reorder/forecast` — needs `purchasing.manage`. Read-only: the copilot
 * never drafts a purchase order from here, because PO lines are product-based
 * while the forecast is ingredient-based.
 */
export async function fetchReorderForecast(
  params: ReorderForecastParams = {},
): Promise<ReorderForecast> {
  const raw = await apiRequest<Record<string, unknown>>("/reorder/forecast", {
    params: forecastParams(params),
  });

  const lookback = (raw.lookback as Record<string, unknown> | undefined) ?? {};
  const settings = (raw.settings as Record<string, unknown> | undefined) ?? {};
  const models = (settings.models as Record<string, unknown> | undefined) ?? {};
  const budget =
    (raw.purchaseMoneyBudget as Record<string, unknown> | undefined) ??
    (raw.purchase_money_budget as Record<string, unknown> | undefined) ??
    {};
  const parcels =
    (raw.suggestedParcelsByProduct as Record<string, unknown>) ??
    (raw.suggested_parcels_by_product as Record<string, unknown>) ??
    {};
  const ingredients = Array.isArray(raw.ingredients) ? raw.ingredients : [];

  const defaultLeadDays = wholeNumber(
    pick(settings, "defaultLeadDays", "default_lead_days"),
    7,
  );

  return {
    forecastAt: String(pick(raw, "forecastAt", "forecast_at") ?? ""),
    lookback: {
      from: String(lookback.from ?? ""),
      until: String(lookback.until ?? ""),
      days: wholeNumber(lookback.days),
    },
    settings: {
      defaultLeadDays,
      minCoverageDays: wholeNumber(
        pick(settings, "minCoverageDays", "min_coverage_days"),
        defaultLeadDays,
      ),
      models: {
        demand: models.demand !== false,
        shelfLife: models.shelfLife !== false,
        leadTime: models.leadTime !== false,
      },
    },
    ingredients: ingredients.map((row) => mapIngredient(row as Record<string, unknown>)),
    purchaseMoneyBudget: {
      amount: quantity(budget.amount),
      currency: String(budget.currency ?? ""),
      note: String(budget.note ?? ""),
    },
    suggestedParcelsByProduct: Object.fromEntries(
      Object.entries(parcels).map(([productId, list]) => [
        String(productId),
        (Array.isArray(list) ? list : []).map((parcel) =>
          mapParcel(parcel as Record<string, unknown>),
        ),
      ]),
    ),
  };
}
