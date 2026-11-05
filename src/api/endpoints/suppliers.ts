import { apiRequest } from "@/api/client";
import type { Supplier } from "@/api/types";

type RawSupplier = {
  id: number | string;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

function mapSupplier(raw: RawSupplier): Supplier {
  return {
    id: String(raw.id),
    name: raw.name,
    contact: raw.contact_person ?? null,
    email: raw.email ?? null,
    phone: raw.phone ?? null,
    address: raw.address ?? null,
  };
}

/**
 * `GET /suppliers` — needs `suppliers.view`. The endpoint has no free-text
 * search, so one page of 50 is fetched and filtered in the screen; keying the
 * query on the term would refetch the same rows on every keystroke.
 */
export async function fetchSuppliers(): Promise<Supplier[]> {
  const page = await apiRequest<{ data: RawSupplier[] }>("/suppliers", {
    params: { per_page: 50 },
  });

  return (page.data ?? []).map(mapSupplier);
}

/** `POST /suppliers` — needs `suppliers.manage`. */
export async function createSupplier(input: {
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
}): Promise<Supplier> {
  const raw = await apiRequest<RawSupplier>("/suppliers", {
    method: "POST",
    body: {
      name: input.name,
      contact_person: input.contact || null,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
    },
  });

  return mapSupplier(raw);
}
