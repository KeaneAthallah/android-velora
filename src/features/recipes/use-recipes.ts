import { useQuery } from "@tanstack/react-query";
import { fetchRecipes } from "@/api/endpoints/recipes";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

/** `GET /recipes?with_recipe=1` — needs `recipes.view`. */
export function useRecipes() {
  const { has } = usePermissions();
  const { businessId } = useTenant();

  return useQuery({
    queryKey: queryKeys.recipes(businessId),
    queryFn: fetchRecipes,
    // `/recipes` itself requires recipes.view; ingredients.view is not enough.
    enabled: Boolean(businessId) && has("recipes.view"),
    staleTime: 60_000,
  });
}
