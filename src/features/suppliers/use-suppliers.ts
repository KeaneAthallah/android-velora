import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupplier, fetchSuppliers } from "@/api/endpoints/suppliers";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

/** `GET /suppliers` — needs `suppliers.view`. The screen filters this page. */
export function useSuppliers() {
  const { has } = usePermissions();
  const { businessId } = useTenant();

  return useQuery({
    queryKey: queryKeys.suppliers(businessId),
    queryFn: fetchSuppliers,
    enabled: Boolean(businessId) && has("suppliers.view"),
    staleTime: 60_000,
  });
}

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSupplier,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}
