import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchTeamMembers,
  fetchTeamRoles,
  inviteTeamMember,
} from "@/api/endpoints/memberships";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

/** `GET /memberships` — needs `employees.view`. */
export function useTeamMembers() {
  const { has } = usePermissions();
  const { businessId } = useTenant();

  return useQuery({
    queryKey: queryKeys.teamMembers(businessId),
    queryFn: fetchTeamMembers,
    enabled: Boolean(businessId) && has("employees.view"),
    staleTime: 30_000,
  });
}

/** `GET /roles` — needs `employees.view`; only fetched when inviting. */
export function useTeamRoles(enabled: boolean) {
  const { has } = usePermissions();
  const { businessId } = useTenant();

  return useQuery({
    queryKey: queryKeys.roles(businessId),
    queryFn: fetchTeamRoles,
    enabled: Boolean(businessId) && enabled && has("employees.view"),
    staleTime: 120_000,
  });
}

/** `POST /memberships/invite` — needs `employees.manage`. */
export function useInviteTeamMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inviteTeamMember,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}
