import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMenu,
  markMenuItemUnavailable,
  restoreMenuItem,
} from "@/api/endpoints/menu";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

/** The active outlet's live menu; `menu.view` and a chosen outlet are required. */
export function useMenu() {
  const { has } = usePermissions();
  const { businessId, outlet } = useTenant();
  const outletId = outlet?.id ?? null;

  return useQuery({
    queryKey: queryKeys.menu(businessId, outletId),
    queryFn: () => fetchMenu(outletId as string),
    enabled: Boolean(businessId && outletId) && has("menu.view"),
    staleTime: 15_000,
  });
}

function useAvailabilityInvalidation() {
  const queryClient = useQueryClient();
  const { businessId, outlet } = useTenant();
  const outletId = outlet?.id ?? null;

  return () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.menu(businessId, outletId),
      }),
      // The register prices from /products, so a restored item should show up
      // there without a reload as well.
      queryClient.invalidateQueries({ queryKey: ["products"] }),
    ]);
}

/** `POST /menu/items/{product}/86` — needs `menu.availability`. */
export function useMarkUnavailableMutation() {
  const invalidate = useAvailabilityInvalidation();

  return useMutation({
    mutationFn: markMenuItemUnavailable,
    onSuccess: invalidate,
  });
}

/** `POST /menu/items/{product}/restore` — needs `menu.availability`. */
export function useRestoreItemMutation() {
  const invalidate = useAvailabilityInvalidation();

  return useMutation({
    mutationFn: restoreMenuItem,
    onSuccess: invalidate,
  });
}
