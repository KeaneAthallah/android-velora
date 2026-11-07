import { useQuery } from "@tanstack/react-query";
import { fetchAvailability } from "@/api/endpoints/recipes";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

/**
 * `GET /recipes/availability` — sellable counts for the whole menu in one call.
 * Backed by `sales.view` because the register gates tiles with it.
 */
export function useRecipeAvailability() {
  const { has } = usePermissions();
  const { businessId, outlet } = useTenant();
  const outletId = outlet?.id ?? null;

  return useQuery({
    queryKey: queryKeys.recipeAvailability(businessId, outletId),
    queryFn: () => fetchAvailability(outletId as string),
    enabled: Boolean(businessId && outletId) && has("sales.view"),
    staleTime: 30_000,
  });
}
