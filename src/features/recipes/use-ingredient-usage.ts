import { useQuery } from "@tanstack/react-query";
import { fetchIngredientUsage } from "@/api/endpoints/recipes";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

/**
 * `GET /ingredients/dashboard` — remaining/consumed stock per ingredient plus
 * the products made from it. Needs `ingredients.view` and an active outlet.
 */
export function useIngredientUsage() {
  const { has } = usePermissions();
  const { businessId, outlet } = useTenant();
  const outletId = outlet?.id ?? null;

  return useQuery({
    queryKey: queryKeys.ingredientUsage(businessId, outletId),
    queryFn: () => fetchIngredientUsage(outletId as string),
    enabled: Boolean(businessId && outletId) && has("ingredients.view"),
    staleTime: 30_000,
  });
}
