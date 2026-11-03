import { useQuery } from "@tanstack/react-query";
import { fetchLowStock, fetchSalesSummary } from "@/api/endpoints/reports";
import { fetchRecentSales } from "@/api/endpoints/sales";
import { fetchProducts } from "@/api/endpoints/products";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant, useOutletId } from "@/providers/tenant-provider";

const ONE_MINUTE = 60 * 1_000;

/**
 * Dashboard reads. Every section is gated on the permission its endpoint
 * requires, so a cashier without `reports.view` simply does not issue the
 * request (and the API is never asked for data the role cannot read).
 */
export function useDashboardData() {
  const { has } = usePermissions();
  const { businessId } = useTenant();
  const outletId = useOutletId();

  const canViewReports = has("reports.view");
  const canViewSales = has("sales.view");
  const canViewInventory = has("inventory.view");
  const canViewProducts = has("products.view");

  const scoped = Boolean(businessId) && Boolean(outletId);

  const summary = useQuery({
    queryKey: queryKeys.salesSummary(businessId, outletId),
    queryFn: () => fetchSalesSummary({ outletId }),
    enabled: scoped && canViewReports,
    staleTime: ONE_MINUTE,
  });

  const lowStock = useQuery({
    queryKey: queryKeys.lowStock(businessId, outletId),
    queryFn: () => fetchLowStock({ outletId, threshold: 5 }),
    enabled: scoped && canViewInventory,
    staleTime: ONE_MINUTE,
  });

  const recentSales = useQuery({
    queryKey: queryKeys.recentSales(businessId, outletId),
    queryFn: () => fetchRecentSales({ outletId, limit: 5 }),
    enabled: scoped && canViewSales,
    staleTime: ONE_MINUTE,
  });

  const productCount = useQuery({
    queryKey: queryKeys.productCount(businessId),
    queryFn: () => fetchProducts({ perPage: 1 }),
    enabled: Boolean(businessId) && canViewProducts,
    staleTime: 5 * ONE_MINUTE,
    select: (page) => page.total,
  });

  const refreshing =
    summary.isRefetching ||
    lowStock.isRefetching ||
    recentSales.isRefetching ||
    productCount.isRefetching;

  const refresh = async () => {
    await Promise.all([
      summary.refetch(),
      lowStock.refetch(),
      recentSales.refetch(),
      productCount.refetch(),
    ]);
  };

  return {
    summary,
    lowStock,
    recentSales,
    productCount,
    refreshing,
    refresh,
    can: {
      reports: canViewReports,
      sales: canViewSales,
      inventory: canViewInventory,
      products: canViewProducts,
    },
  };
}
