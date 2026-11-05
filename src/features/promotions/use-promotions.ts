import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPromotions, setPromotionActive } from "@/api/endpoints/promotions";
import type { Promotion } from "@/api/types";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

/** `GET /promotions` — needs `promotions.view`. */
export function usePromotions() {
  const { has } = usePermissions();
  const { businessId } = useTenant();

  return useQuery({
    queryKey: queryKeys.promotions(businessId),
    queryFn: fetchPromotions,
    enabled: Boolean(businessId) && has("promotions.view"),
    staleTime: 30_000,
  });
}

/** `PUT /promotions/{id}` — needs `promotions.manage`; used to pause or resume. */
export function useSetPromotionActiveMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      promotion,
      active,
    }: {
      promotion: Promotion;
      active: boolean;
    }) => setPromotionActive(promotion, active),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
  });
}
