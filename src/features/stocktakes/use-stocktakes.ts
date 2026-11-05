import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelStocktake,
  createStocktake,
  fetchStocktake,
  fetchStocktakes,
  postStocktake,
  saveStocktakeCounts,
} from "@/api/endpoints/stocktakes";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

/** `GET /stocktakes` — needs `inventory.view`. */
export function useStocktakes() {
  const { has } = usePermissions();
  const { businessId } = useTenant();

  return useQuery({
    queryKey: queryKeys.stocktakes(businessId, null),
    queryFn: fetchStocktakes,
    enabled: Boolean(businessId) && has("inventory.view"),
    staleTime: 15_000,
  });
}

/** `GET /stocktakes/{id}` — loaded only while a count sheet is open. */
export function useStocktake(stocktakeId: string | null) {
  const { has } = usePermissions();
  const { businessId } = useTenant();

  return useQuery({
    queryKey: queryKeys.stocktake(businessId, stocktakeId ?? "none"),
    queryFn: () => fetchStocktake(stocktakeId!),
    enabled:
      Boolean(businessId) && Boolean(stocktakeId) && has("inventory.view"),
    staleTime: 10_000,
  });
}

function useInvalidateStocktakes() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ["stocktakes"] });
    await queryClient.invalidateQueries({ queryKey: ["stocktake"] });
    await queryClient.invalidateQueries({ queryKey: ["inventory"] });
  };
}

/** `POST /stocktakes` — snapshots the outlet's current balances as expected. */
export function useCreateStocktakeMutation() {
  const invalidate = useInvalidateStocktakes();
  return useMutation({
    mutationFn: createStocktake,
    onSuccess: invalidate,
  });
}

/** `PUT /stocktakes/{id}` — saves counted quantities, moves draft to in progress. */
export function useSaveStocktakeCountsMutation() {
  const invalidate = useInvalidateStocktakes();
  return useMutation({
    mutationFn: saveStocktakeCounts,
    onSuccess: invalidate,
  });
}

/** `POST /stocktakes/{id}/post` — writes the variance as stock movements. */
export function usePostStocktakeMutation() {
  const invalidate = useInvalidateStocktakes();
  return useMutation({
    mutationFn: ({
      id,
      confirmZeroCount,
    }: {
      id: string;
      confirmZeroCount?: boolean;
    }) => postStocktake(id, { confirmZeroCount }),
    onSuccess: invalidate,
  });
}

/** `POST /stocktakes/{id}/cancel` — closes the count without moving stock. */
export function useCancelStocktakeMutation() {
  const invalidate = useInvalidateStocktakes();
  return useMutation({
    mutationFn: cancelStocktake,
    onSuccess: invalidate,
  });
}
