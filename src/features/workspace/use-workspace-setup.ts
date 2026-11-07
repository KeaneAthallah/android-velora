import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import {
  createBusiness,
  createOutlet,
  type CreateBusinessInput,
  type CreateOutletInput,
} from "@/api/endpoints/tenant";
import type { Outlet } from "@/api/types";
import { useAuth } from "@/providers/auth-provider";

type RawIndustry = {
  slug: string;
  name: string;
  short_name?: string | null;
};

export type Industry = {
  slug: string;
  name: string;
  shortName: string | null;
};

/** Industry catalogue (`GET /industries`) — used to pick a workspace template. */
export async function fetchIndustries(): Promise<Industry[]> {
  const rows = await apiRequest<RawIndustry[]>("/industries");
  return (rows ?? []).map((row) => ({
    slug: row.slug,
    name: row.name,
    shortName: row.short_name ?? null,
  }));
}

export function useIndustries() {
  return useQuery({
    queryKey: ["industries"],
    queryFn: fetchIndustries,
    staleTime: 60 * 60 * 1_000,
  });
}

export type WorkspaceSetupInput = {
  /** `null` when the account already has a business and only needs an outlet. */
  business: CreateBusinessInput | null;
  outlet: CreateOutletInput;
};

/**
 * Creates the workspace a brand-new account needs: a business (which makes the
 * caller its owner) plus its first outlet.
 *
 * Order matters — the outlet endpoint is tenant-scoped, so the new business has
 * to be switched into the client's tenant context before the outlet is posted.
 */
export function useCreateWorkspaceMutation() {
  const queryClient = useQueryClient();
  const { switchBusiness, refreshSession } = useAuth();

  return useMutation({
    mutationFn: async (
      input: WorkspaceSetupInput,
    ): Promise<{ outlet: Outlet; businessName: string | null }> => {
      let businessName: string | null = null;

      if (input.business) {
        const business = await createBusiness(input.business);
        businessName = business.name;
        await switchBusiness(business.id);
      }

      const outlet = await createOutlet(input.outlet);
      await refreshSession();

      return { outlet, businessName };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["outlets"] });
    },
  });
}
