import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeStockTransfer,
  fetchStockTransfers,
} from "@/api/endpoints/stock-transfers";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

/** `GET /stock-transfers` — needs `inventory.view`. */
export function useStockTransfers() {
  const { has } = usePermissions();
  const { businessId } = useTenant();

  return useQuery({
    queryKey: queryKeys.stockTransfers(businessId),
    queryFn: fetchStockTransfers,
    enabled: Boolean(businessId) && has("inventory.view"),
    staleTime: 15_000,
  });
}

/** `POST /stock-transfers/{id}/complete` — needs `inventory.adjust`. */
export function useCompleteStockTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeStockTransfer,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      // Stock moved, so the balances and the movement log are stale too.
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
