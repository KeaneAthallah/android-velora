import { apiRequest } from "@/api/client";
import type { Outlet, Paginated } from "@/api/types";

type RawOutlet = {
  id: number | string;
  business_id: number | string;
  name: string;
  code: string | null;
  status: string | null;
};

function mapOutlet(raw: RawOutlet): Outlet {
  return {
    id: String(raw.id),
    businessId: String(raw.business_id),
    name: raw.name,
    code: raw.code ?? null,
    status: raw.status ?? "active",
  };
}

/** Outlets for the active business (`GET /outlets`, needs `outlets.view`). */
export async function fetchOutlets(): Promise<Outlet[]> {
  const page = await apiRequest<Paginated<RawOutlet>>("/outlets", {
    params: { per_page: 100 },
  });

  return page.data.map(mapOutlet);
}

export type CreateBusinessInput = {
  name: string;
  industry?: string;
  currency?: string;
  timezone?: string;
};

/**
 * Create a business (`POST /businesses`). Deliberately outside the tenant
 * middleware: the caller becomes the owner and the response is the only way to
 * learn the new business id.
 */
export async function createBusiness(
  input: CreateBusinessInput,
): Promise<{ id: string; name: string }> {
  const raw = await apiRequest<{ id: number | string; name: string }>(
    "/businesses",
    {
      method: "POST",
      body: {
        name: input.name,
        industry: input.industry || undefined,
        currency: input.currency || undefined,
        timezone: input.timezone || undefined,
      },
    },
  );

  return { id: String(raw.id), name: raw.name };
}

export type CreateOutletInput = {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  timezone?: string;
};

/**
 * Create an outlet (`POST /outlets`, needs `outlets.manage`). The request must
 * carry `X-Business-Id`, so the new business has to be the active tenant first.
 */
export async function createOutlet(
  input: CreateOutletInput,
): Promise<Outlet> {
  const raw = await apiRequest<RawOutlet>("/outlets", {
    method: "POST",
    body: {
      name: input.name,
      code: input.code,
      address: input.address || undefined,
      phone: input.phone || undefined,
      timezone: input.timezone || undefined,
    },
  });

  return mapOutlet(raw);
}
