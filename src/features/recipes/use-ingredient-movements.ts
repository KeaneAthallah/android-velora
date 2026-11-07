import { useQuery } from "@tanstack/react-query";
import { fetchIngredientMovements } from "@/api/endpoints/recipes";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

/**
 * `GET /ingredient-movements` — the stock ledger for one ingredient at the
 * active outlet: purchases, sale deductions, voids and wastage, newest first.
 */
export function useIngredientMovements(ingredientId: string | null) {
  const { has } = usePermissions();
  const { businessId, outlet } = useTenant();
  const outletId = outlet?.id ?? null;

  return useQuery({
    queryKey: queryKeys.ingredientMovements(businessId, outletId, ingredientId),
    queryFn: () =>
      fetchIngredientMovements(ingredientId as string, outletId as string),
    enabled: Boolean(ingredientId && businessId && outletId) && has("ingredients.view"),
    staleTime: 15_000,
  });
}
