import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchInventoryBalances, adjustStock } from "@/api/endpoints/inventory";
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

export function useAdjustStockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof adjustStock>[0]) => adjustStock(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory", "balances"] });
    },
  });
}