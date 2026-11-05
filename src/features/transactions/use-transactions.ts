import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchSalesPage } from "@/api/endpoints/sales";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

/**
 * `GET /sales` as an infinite ledger of finalised and voided sales — needs
 * `sales.view`. Open tabs are intentionally excluded (they live on Orders).
 */
export function useSalesLedger({
  search,
  status,
}: {
  search: string;
  status: string | null;
}) {
  const { has } = usePermissions();
  const { businessId, outlet } = useTenant();
  const outletId = outlet?.id ?? null;

  return useInfiniteQuery({
    queryKey: queryKeys.salesList(businessId, outletId, { search, status }),
    queryFn: ({ pageParam }) =>
      fetchSalesPage({
        page: pageParam,
        search,
        status,
        outletId,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.current_page < lastPage.last_page
        ? lastPage.current_page + 1
        : undefined,
    enabled: Boolean(businessId) && has("sales.view"),
    staleTime: 15_000,
  });
}
