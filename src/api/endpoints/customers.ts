import { apiRequest } from "@/api/client";

type RawCustomer = {
  id: number | string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  loyalty_number?: string | null;
  loyalty_points?: number | null;
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  loyaltyNumber: string | null;
  loyaltyPoints: number;
};

function mapCustomer(raw: RawCustomer): Customer {
  return {
    id: String(raw.id),
    name: raw.name,
    phone: raw.phone ?? null,
    email: raw.email ?? null,
    address: raw.address ?? null,
    loyaltyNumber: raw.loyalty_number ?? null,
    loyaltyPoints: raw.loyalty_points ?? 0,
  };
}

export async function fetchCustomers(search?: string): Promise<Customer[]> {
  const page = await apiRequest<{ data: RawCustomer[] }>("/customers", {
    params: { search: search?.trim() || undefined, per_page: 50 },
  });
  return (page.data ?? []).map(mapCustomer);
}

export async function createCustomer(input: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}): Promise<Customer> {
  const raw = await apiRequest<RawCustomer>("/customers", {
    method: "POST",
    body: {
      name: input.name,
      phone: input.phone || undefined,
      email: input.email || undefined,
      address: input.address || undefined,
    },
  });
  return mapCustomer(raw);
}