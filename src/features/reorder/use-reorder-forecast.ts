import { useQuery } from "@tanstack/react-query";
import { fetchReorderForecast } from "@/api/endpoints/reorder";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

/**
 * `GET /reorder/forecast` — needs `purchasing.manage`, not just view: the
 * backend endpoint is gated on the manage permission.
 */
export function useReorderForecast() {
  const { has } = usePermissions();
  const { businessId, outlet } = useTenant();
  const outletId = outlet?.id ?? null;

  return useQuery({
    queryKey: queryKeys.reorderForecast(businessId, outletId),
    queryFn: () => fetchReorderForecast(),
    enabled: Boolean(businessId) && has("purchasing.manage"),
    staleTime: 60_000,
  });
}
