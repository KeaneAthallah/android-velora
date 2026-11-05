import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchChannels, setChannelActive } from "@/api/endpoints/channels";
import type { SalesChannel } from "@/api/types";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

/** `GET /channels` — needs `channels.view`. */
export function useChannels() {
  const { has } = usePermissions();
  const { businessId } = useTenant();

  return useQuery({
    queryKey: queryKeys.channels(businessId),
    queryFn: fetchChannels,
    enabled: Boolean(businessId) && has("channels.view"),
    staleTime: 30_000,
  });
}

/** `PUT /channels/{id}` — needs `channels.manage`; take a channel on/offline. */
export function useSetChannelActiveMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      channel,
      active,
    }: {
      channel: SalesChannel;
      active: boolean;
    }) => setChannelActive(channel, active),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}
