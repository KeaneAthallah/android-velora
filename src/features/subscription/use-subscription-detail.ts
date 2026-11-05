import { useQuery } from "@tanstack/react-query";
import { fetchSubscriptionDetail } from "@/api/endpoints/subscription";
import { queryKeys } from "@/lib/query-keys";
import { useTenant } from "@/providers/tenant-provider";

/**
 * `GET /subscription` — plan, period and usage meters. Every signed-in member
 * may read it; the gates themselves come from `/me`.
 */
export function useSubscriptionDetail() {
  const { businessId } = useTenant();

  return useQuery({
    queryKey: queryKeys.subscription(businessId),
    queryFn: fetchSubscriptionDetail,
    enabled: Boolean(businessId),
    staleTime: 60_000,
  });
}
