/** Stable React Query keys. Always include the tenant scope so switching a
 *  business or outlet never shows the previous tenant's cached rows. */
export const queryKeys = {
  outlets: (businessId: string | null) => ["outlets", businessId] as const,
  categories: (businessId: string | null) => ["categories", businessId] as const,
  products: (
    businessId: string | null,
    filters: { search: string; categoryId: string | null },
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
};
