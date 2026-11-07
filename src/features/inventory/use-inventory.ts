import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchInventoryBalances, adjustStock } from "@/api/endpoints/inventory";
import { fetchProducts } from "@/api/endpoints/products";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

export function useInventoryBalances() {
  const { has } = usePermissions();
  const { businessId, outlet } = useTenant();

  return useQuery({
    queryKey: ["inventory", "balances", businessId, outlet?.id ?? null],
    queryFn: () => fetchInventoryBalances(outlet?.id ?? null),
    enabled: Boolean(businessId) && has("inventory.view"),
    staleTime: 30_000,
  });
}

/**
 * Products that can be stocked. Needed because a product has no balance row
 * until its first movement, so the balance list alone cannot be a picker.
 */
export function useStockableProducts() {
  const { has } = usePermissions();
  const { businessId } = useTenant();

  return useQuery({
    queryKey: ["products", "stockable", businessId],
    queryFn: () => fetchProducts({ perPage: 100, isActive: true }),
    enabled: Boolean(businessId) && has("inventory.adjust"),
    staleTime: 60_000,
    select: (page) => page.data,
  });
}

export function useAdjustStockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof adjustStock>[0]) => adjustStock(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory", "balances"] });
    },
  });
}