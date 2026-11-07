import { apiRequest } from "@/api/client";

export type StorefrontOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "failed";

/** Status order an order normally moves through, for the "advance" action. */
export const STOREFRONT_ORDER_FLOW: StorefrontOrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
];

export type Storefront = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  itemCount: number;
  orderCount: number;
};

export type StorefrontOrder = {
  id: string;
  number: string;
  status: StorefrontOrderStatus;
  fulfilmentType: string;
  paymentStatus: string;
  paymentMethod: string | null;
  customerName: string;
  total: number;
  placedAt: string | null;
};

type RawStorefront = {
  id: number | string;
  name: string;
  slug?: string | null;
  is_active?: boolean | null;
  items_count?: number | null;
  orders_count?: number | null;
};

type RawStorefrontOrder = {
  id: number | string;
  number?: string | null;
  status?: string | null;
  fulfilment_type?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  customer_name?: string | null;
  total?: string | number | null;
  placed_at?: string | null;
};

function mapStorefront(raw: RawStorefront): Storefront {
  return {
    id: String(raw.id),
    name: raw.name,
    slug: raw.slug ?? "",
    isActive: raw.is_active === true,
    itemCount: Number(raw.items_count ?? 0) || 0,
    orderCount: Number(raw.orders_count ?? 0) || 0,
  };
}

function mapStorefrontOrder(raw: RawStorefrontOrder): StorefrontOrder {
  return {
    id: String(raw.id),
    number: raw.number ?? "",
    status: (raw.status ?? "pending") as StorefrontOrderStatus,
    fulfilmentType: raw.fulfilment_type ?? "delivery",
    paymentStatus: raw.payment_status ?? "unpaid",
    paymentMethod: raw.payment_method ?? null,
    customerName: raw.customer_name ?? "Shopper",
    total: Number(raw.total ?? 0) || 0,
    placedAt: raw.placed_at ?? null,
  };
}

/** `GET /storefronts` — needs `storefront.view`; returns every storefront. */
export async function fetchStorefronts(): Promise<Storefront[]> {
  const rows = await apiRequest<RawStorefront[]>("/storefronts");
  return (rows ?? []).map(mapStorefront);
}

/** `GET /storefronts/{id}/orders` — needs `storefront.orders`. */
export async function fetchStorefrontOrders(
  storefrontId: string,
  { status }: { status?: StorefrontOrderStatus } = {},
): Promise<StorefrontOrder[]> {
  const page = await apiRequest<{ data?: RawStorefrontOrder[] }>(
    `/storefronts/${encodeURIComponent(storefrontId)}/orders`,
    { params: { status, per_page: 50 } },
  );

  return (page.data ?? []).map(mapStorefrontOrder);
}

/** `POST /storefront-orders/{id}/status` — needs `storefront.orders`. */
export async function updateStorefrontOrderStatus(
  id: string,
  status: StorefrontOrderStatus,
  message?: string,
): Promise<StorefrontOrder> {
  const raw = await apiRequest<RawStorefrontOrder>(
    `/storefront-orders/${encodeURIComponent(id)}/status`,
    { method: "POST", body: { status, message: message?.trim() || undefined } },
  );

  return mapStorefrontOrder(raw);
}

/** `POST /storefront-orders/{id}/payment` — needs `storefront.orders`. */
export async function markStorefrontOrderPaid(
  id: string,
  method = "manual",
): Promise<StorefrontOrder> {
  const raw = await apiRequest<RawStorefrontOrder>(
    `/storefront-orders/${encodeURIComponent(id)}/payment`,
    { method: "POST", body: { method } },
  );

  return mapStorefrontOrder(raw);
}
