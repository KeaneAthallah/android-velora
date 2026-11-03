import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCustomers, createCustomer } from "@/api/endpoints/customers";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

export function useCustomers(search: string) {
  const { has } = usePermissions();
  const { businessId } = useTenant();
  return useQuery({
    queryKey: ["customers", businessId, search],
    queryFn: () => fetchCustomers(search),
    enabled: Boolean(businessId) && has("customers.view"),
    staleTime: 30_000,
  });
}

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}