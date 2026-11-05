import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchFloorPlan, updateTableStatus } from "@/api/endpoints/tables";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

/** `GET /tables` for the active outlet — needs `tables.view`. */
export function useFloorPlan() {
  const { has } = usePermissions();
  const { businessId, outlet } = useTenant();
  const outletId = outlet?.id ?? null;

  return useQuery({
    queryKey: queryKeys.floorPlan(businessId, outletId),
    queryFn: () => fetchFloorPlan(outletId),
    enabled: Boolean(businessId) && has("tables.view"),
    staleTime: 15_000,
  });
}

/** `POST /tables/{table}/status` — needs `tables.manage`. */
export function useTableStatusMutation() {
  const queryClient = useQueryClient();
  const { businessId, outlet } = useTenant();
  const outletId = outlet?.id ?? null;

  return useMutation({
    mutationFn: updateTableStatus,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.floorPlan(businessId, outletId),
      }),
  });
}
