import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchKitchenTickets, updateKitchenTicketStatus } from "@/api/endpoints/kitchen";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

export function useKitchenTickets() {
  const { has } = usePermissions();
  const { businessId, outlet } = useTenant();
  return useQuery({
    queryKey: ["kitchen", "tickets", businessId, outlet?.id ?? null],
    queryFn: () => fetchKitchenTickets("active"),
    enabled: Boolean(businessId) && has("kitchen.view"),
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
}

export function useUpdateKitchenTicketMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "preparing" | "ready" | "served" }) =>
      updateKitchenTicketStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["kitchen", "tickets"] });
    },
  });
}