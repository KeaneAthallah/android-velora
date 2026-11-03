import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approvePurchaseOrder,
  fetchPurchaseOrders,
  receivePurchaseOrder,
} from "@/api/endpoints/purchasing";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

export function usePurchaseOrders() {
  const { has } = usePermissions();
  const { businessId } = useTenant();
  return useQuery({
    queryKey: ["purchase-orders", businessId],
    queryFn: fetchPurchaseOrders,
    enabled: Boolean(businessId) && has("purchasing.view"),
    staleTime: 30_000,
  });
}

export function useApprovePoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approvePurchaseOrder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });
}

export function useReceivePoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: { purchaseOrderItemId: string; quantity: string }[] }) =>
      receivePurchaseOrder(id, items),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory", "balances"] });
    },
  });
}