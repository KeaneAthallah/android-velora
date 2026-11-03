import { apiRequest } from "@/api/client";
import type { Outlet, Paginated } from "@/api/types";

type RawOutlet = {
  id: number | string;
  business_id: number | string;
  name: string;
  code: string | null;
  status: string | null;
};

/** Outlets for the active business (`GET /outlets`, needs `outlets.view`). */
export async function fetchOutlets(): Promise<Outlet[]> {
  const page = await apiRequest<Paginated<RawOutlet>>("/outlets", {
    params: { per_page: 100 },
  });

  return page.data.map((raw) => ({
    id: String(raw.id),
    businessId: String(raw.business_id),
    name: raw.name,
    code: raw.code ?? null,
    status: raw.status ?? "active",
  }));
}
