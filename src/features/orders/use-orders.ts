import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  cancelOrder,
  checkoutOrder,
  createOrder,
  fetchOrder,
  fetchOrders,
  updateOrderStatus,
  type CreateOrderInput,
  type CheckoutOrderInput,
} from "@/api/endpoints/orders";
import type { Sale } from "@/api/types";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

export function useOrders(status: "active" | "all" = "active") {
  const { has } = usePermissions();
  const { businessId, outlet } = useTenant();

  return useQuery<Sale[]>({
    queryKey: ["orders", businessId, outlet?.id ?? null, status],
    queryFn: () => fetchOrders({ status, outletId: outlet?.id ?? null }),
    enabled: Boolean(businessId) && has("orders.view"),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useOrder(id: string) {
  const { has } = usePermissions();
  return useQuery<Sale>({
    queryKey: ["order", id],
    queryFn: () => fetchOrder(id),
    enabled: Boolean(id) && has("orders.view"),
  });
}

export function useOrderStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "in_kitchen" | "ready" | "served" }) =>
      updateOrderStatus(id, status),
    onSuccess: async (sale) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["order", sale.id] }),
      ]);
    },
  });
}

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelOrder(id, reason),
    onSuccess: async (sale) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["order", sale.id] }),
        queryClient.invalidateQueries({ queryKey: ["sales"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
      ]);
    },
  });
}

export function useCheckoutOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CheckoutOrderInput }) => checkoutOrder(id, input),
    onSuccess: async (sale) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["order", sale.id] }),
        queryClient.invalidateQueries({ queryKey: ["sales"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
    },
  });
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: async (sale) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
      ]);
    },
  });
}

export { ApiError };