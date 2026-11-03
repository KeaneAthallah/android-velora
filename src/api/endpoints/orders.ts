import { apiRequest } from "@/api/client";
import { mapSale } from "@/api/endpoints/sales";
import type { Paginated, Sale } from "@/api/types";
import type { SaleLineInput, SalePaymentInput } from "@/api/endpoints/sales";

type RawSale = Parameters<typeof mapSale>[0];

export type OrderStatus = "open" | "in_kitchen" | "ready" | "served" | "completed" | "cancelled";

export type FetchOrdersParams = {
  status?: "active" | "all" | OrderStatus;
  orderType?: string;
  search?: string;
  outletId?: string | null;
};

/** `GET /orders` — needs `orders.view`. Defaults to active (open) orders. */
export async function fetchOrders(params: FetchOrdersParams = {}): Promise<Sale[]> {
  const page = await apiRequest<Paginated<RawSale>>("/orders", {
    params: {
      status: params.status ?? "active",
      order_type: params.orderType || undefined,
      q: params.search?.trim() || undefined,
      outlet_id: params.outletId ?? undefined,
    },
  });
  return page.data.map(mapSale);
}

/** `GET /orders/{id}` — needs `orders.view`. */
export async function fetchOrder(id: string): Promise<Sale> {
  const raw = await apiRequest<RawSale>(`/orders/${encodeURIComponent(id)}`);
  return mapSale(raw);
}

export type CreateOrderInput = {
  items: SaleLineInput[];
  orderType: string;
  notes?: string | null;
  promotionCode?: string | null;
  customerId?: string | null;
  fulfilment?: { contactPhone?: string; address?: string } | null;
  idempotencyKey: string;
};

/** `POST /orders` — needs `orders.create`. Opens a draft tab. */
export async function createOrder(input: CreateOrderInput): Promise<Sale> {
  const raw = await apiRequest<RawSale>("/orders", {
    method: "POST",
    body: {
      order_type: input.orderType,
      customer_id: input.customerId ? Number(input.customerId) : undefined,
      notes: input.notes?.trim() || undefined,
      promotion_code: input.promotionCode?.trim() || undefined,
      idempotency_key: input.idempotencyKey,
      fulfilment: input.fulfilment
        ? {
            contact_phone: input.fulfilment.contactPhone?.trim() || undefined,
            address: input.fulfilment.address?.trim() || undefined,
          }
        : undefined,
      items: input.items.map((item) => ({
        product_id: Number(item.productId),
        product_variant_id: item.variantId ? Number(item.variantId) : null,
        quantity: item.quantity,
        discount_amount: item.discount ? Number(item.discount) : 0,
        notes: item.notes ?? undefined,
      })),
    },
  });
  return mapSale(raw);
}

/** `POST /orders/{id}/status` — needs `orders.manage`. Forward-only progression. */
export async function updateOrderStatus(id: string, status: "in_kitchen" | "ready" | "served"): Promise<Sale> {
  const raw = await apiRequest<RawSale>(`/orders/${encodeURIComponent(id)}/status`, {
    method: "POST",
    body: { status },
  });
  return mapSale(raw);
}

/** `POST /orders/{id}/cancel` — needs `orders.cancel`. */
export async function cancelOrder(id: string, reason: string): Promise<Sale> {
  const raw = await apiRequest<RawSale>(`/orders/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: { reason },
  });
  return mapSale(raw);
}

export type CheckoutOrderInput = {
  payments: SalePaymentInput[];
  promotionCode?: string | null;
  customerId?: string | null;
  idempotencyKey: string;
};

/** `POST /orders/{id}/checkout` — needs `orders.manage`. Finalises the tab. */
export async function checkoutOrder(id: string, input: CheckoutOrderInput): Promise<Sale> {
  const raw = await apiRequest<RawSale>(`/orders/${encodeURIComponent(id)}/checkout`, {
    method: "POST",
    body: {
      payments: input.payments.map((payment) => ({
        method: payment.method,
        amount: payment.amount,
        reference: payment.reference || undefined,
      })),
      promotion_code: input.promotionCode?.trim() || undefined,
      customer_id: input.customerId ? Number(input.customerId) : undefined,
      idempotency_key: input.idempotencyKey,
    },
  });
  return mapSale(raw);
}