/** Stable React Query keys. Always include the tenant scope so switching a
 *  business or outlet never shows the previous tenant's cached rows. */
export const queryKeys = {
  outlets: (businessId: string | null) => ["outlets", businessId] as const,
  categories: (businessId: string | null) => ["categories", businessId] as const,
  products: (
    businessId: string | null,
    filters: { search: string; categoryId: string | null; activeOnly?: boolean },
  ) => ["products", businessId, filters] as const,
  productCount: (businessId: string | null) =>
    ["products", "count", businessId] as const,
  product: (businessId: string | null, productId: string) =>
    ["product", businessId, productId] as const,
  salesSummary: (businessId: string | null, outletId: string | null) =>
    ["reports", "sales-summary", businessId, outletId] as const,
  salesByProduct: (businessId: string | null, outletId: string | null) =>
    ["reports", "sales-by-product", businessId, outletId] as const,
  lowStock: (businessId: string | null, outletId: string | null) =>
    ["reports", "low-stock", businessId, outletId] as const,
  recentSales: (businessId: string | null, outletId: string | null) =>
    ["sales", "recent", businessId, outletId] as const,
  paymentMethods: (businessId: string | null) =>
    ["payment-methods", businessId] as const,
  cartPreview: (
    businessId: string | null,
    outletId: string | null,
    signature: string,
  ) => ["pos", "preview", businessId, outletId, signature] as const,
  receipt: (businessId: string | null, saleId: string) =>
    ["sales", "receipt", businessId, saleId] as const,
  salesList: (
    businessId: string | null,
    outletId: string | null,
    filters: { search: string; status: string | null },
  ) => ["sales", "list", businessId, outletId, filters] as const,
  menu: (businessId: string | null, outletId: string | null) =>
    ["menu", businessId, outletId] as const,
  floorPlan: (businessId: string | null, outletId: string | null) =>
    ["tables", businessId, outletId] as const,
  suppliers: (businessId: string | null) => ["suppliers", businessId] as const,
  promotions: (businessId: string | null) => ["promotions", businessId] as const,
  stockTransfers: (businessId: string | null) =>
    ["stock-transfers", businessId] as const,
  stocktakes: (businessId: string | null, outletId: string | null) =>
    ["stocktakes", businessId, outletId] as const,
  stocktake: (businessId: string | null, stocktakeId: string) =>
    ["stocktake", businessId, stocktakeId] as const,
  recipes: (businessId: string | null) => ["recipes", businessId] as const,
  ingredientUsage: (businessId: string | null, outletId: string | null) =>
    ["ingredients", "usage", businessId, outletId] as const,
  recipeAvailability: (businessId: string | null, outletId: string | null) =>
    ["recipes", "availability", businessId, outletId] as const,
  reorderForecast: (businessId: string | null, outletId: string | null) =>
    ["reorder", "forecast", businessId, outletId] as const,
  ingredientMovements: (
    businessId: string | null,
    outletId: string | null,
    ingredientId: string | null,
  ) => ["ingredients", "movements", businessId, outletId, ingredientId] as const,
  teamMembers: (businessId: string | null) =>
    ["memberships", businessId] as const,
  roles: (businessId: string | null) => ["roles", businessId] as const,
  channels: (businessId: string | null) => ["channels", businessId] as const,
  subscription: (businessId: string | null) =>
    ["subscription", businessId] as const,
  attendances: (businessId: string | null, outletId: string | null) =>
    ["attendance", businessId, outletId] as const,
  leaveRequests: (businessId: string | null, status: string) =>
    ["leave", businessId, status] as const,
  leaveCategories: (businessId: string | null) =>
    ["leave", "categories", businessId] as const,
  storefronts: (businessId: string | null) =>
    ["storefronts", businessId] as const,
  storefrontOrders: (businessId: string | null, storefrontId: string) =>
    ["storefronts", businessId, storefrontId, "orders"] as const,
  financialSummary: (
    businessId: string | null,
    outletId: string | null,
    from: string,
    to: string,
  ) => ["finance", businessId, outletId, from, to] as const,
  aging: (businessId: string | null, kind: "ar" | "ap") =>
    ["finance", businessId, "aging", kind] as const,
};
