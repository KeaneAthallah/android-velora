import { apiRequest } from "@/api/client";
import type {
  CartPreview,
  OrderType,
  Paginated,
  Sale,
  SaleItem,
  SalePayment,
  SaleReceipt,
} from "@/api/types";

type RawSaleItem = {
  id: number | string;
  product_name: string;
  sku: string | null;
  quantity: string;
  unit_price: string;
  discount_amount?: string | null;
  line_total: string;
  notes?: string | null;
};

type RawPayment = {
  id: number | string;
  method: string;
  amount: string;
  status: string;
  reference?: string | null;
};

type RawEntity = {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
};

type RawSale = {
  id: number | string;
  receipt_number: string;
  order_number: string;
  status: string;
  order_status?: string | null;
  order_type: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total: string;
  paid_amount: string;
  change_amount?: string | null;
  notes?: string | null;
  void_reason?: string | null;
  voided_at?: string | null;
  promotion_code?: string | null;
  promotion_discount?: string | null;
  created_at: string;
  items?: RawSaleItem[] | null;
  payments?: RawPayment[] | null;
  outlet?: RawEntity | null;
  cashier?: RawEntity | null;
  customer?: RawEntity | null;
};

function mapItem(raw: RawSaleItem): SaleItem {
  return {
    id: String(raw.id),
    productName: raw.product_name,
    sku: raw.sku ?? "",
    quantity: raw.quantity,
    unitPrice: raw.unit_price,
    discountAmount: raw.discount_amount ?? "0",
    lineTotal: raw.line_total,
    notes: raw.notes ?? null,
  };
}

function mapPayment(raw: RawPayment): SalePayment {
  return {
    id: String(raw.id),
    method: raw.method,
    amount: raw.amount,
    status: raw.status,
    reference: raw.reference ?? null,
  };
}

export function mapSale(raw: RawSale): Sale {
  return {
    id: String(raw.id),
    receiptNumber: raw.receipt_number,
    orderNumber: raw.order_number,
    status: raw.status,
    orderStatus: raw.order_status ?? "",
    orderType: raw.order_type,
    subtotal: raw.subtotal,
    discountAmount: raw.discount_amount,
    taxAmount: raw.tax_amount,
    total: raw.total,
    paidAmount: raw.paid_amount,
    changeAmount: raw.change_amount ?? "0",
    notes: raw.notes ?? null,
    voidReason: raw.void_reason ?? null,
    voidedAt: raw.voided_at ?? null,
    createdAt: raw.created_at,
    items: (raw.items ?? []).map(mapItem),
    payments: (raw.payments ?? []).map(mapPayment),
  };
}

/** `GET /sales` — needs `sales.view`. The backend caps a page at 50 rows. */
export async function fetchRecentSales({
  outletId,
  limit = 5,
}: {
  outletId?: string | null;
  limit?: number;
}): Promise<Sale[]> {
  const page = await apiRequest<Paginated<RawSale>>("/sales", {
    params: { outlet_id: outletId ?? undefined },
  });

  return page.data.slice(0, limit).map(mapSale);
}

export type SaleListFilters = {
  page?: number;
  search?: string;
  /** `completed | voided | refunded | …` — omitted, the API hides draft tabs. */
  status?: string | null;
  outletId?: string | null;
};

/**
 * `GET /sales` — needs `sales.view`. The ledger endpoint: open tabs are
 * excluded unless a status is asked for, and a page holds at most 50 rows.
 */
export async function fetchSalesPage(
  filters: SaleListFilters = {},
): Promise<Paginated<Sale>> {
  const page = await apiRequest<Paginated<RawSale>>("/sales", {
    params: {
      page: filters.page ?? 1,
      outlet_id: filters.outletId ? Number(filters.outletId) : undefined,
      status: filters.status ?? undefined,
      q: filters.search?.trim() || undefined,
    },
  });

  return { ...page, data: page.data.map(mapSale) };
}

/** `GET /sales/{id}` — needs `sales.view`. */
export async function fetchSale(id: string): Promise<Sale> {
  const raw = await apiRequest<RawSale>(`/sales/${encodeURIComponent(id)}`);
  return mapSale(raw);
}

/**
 * `GET /sales/{id}/receipt` — needs `sales.view`. Includes the outlet, cashier
 * and customer the printed receipt names.
 */
export async function fetchSaleReceipt(id: string): Promise<SaleReceipt> {
  const raw = await apiRequest<RawSale>(`/sales/${encodeURIComponent(id)}/receipt`);

  return {
    ...mapSale(raw),
    outletName: raw.outlet?.name ?? "",
    outletAddress: raw.outlet?.address ?? null,
    outletPhone: raw.outlet?.phone ?? null,
    cashierName: raw.cashier?.name ?? "",
    customerName: raw.customer?.name ?? null,
    promotionCode: raw.promotion_code ?? null,
    promotionDiscount: raw.promotion_discount ?? "0",
  };
}

export type SaleLineInput = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  /** Manual line discount in currency units, as the cashier typed it. */
  discount?: string;
  notes?: string | null;
};

export type SalePaymentInput = {
  method: string;
  amount: string;
  reference?: string | null;
};

export type CreateSaleInput = {
  items: SaleLineInput[];
  orderType: OrderType;
  notes?: string | null;
  promotionCode?: string | null;
  /** Required by the API for `delivery` orders. */
  fulfilment?: {
    contactPhone?: string;
    address?: string;
  } | null;
  idempotencyKey: string;
};

function toItemPayload(item: SaleLineInput) {
  return {
    product_id: Number(item.productId),
    product_variant_id: item.variantId ? Number(item.variantId) : null,
    quantity: item.quantity,
    // The backend validates this as a numeric >= 0.
    discount_amount: item.discount ? Number(item.discount) : 0,
    notes: item.notes ?? undefined,
  };
}

/**
 * `POST /sales` — needs `sales.create`. The server prices the cart, so the
 * response total is the only one worth showing. `idempotency_key` makes a
 * retried checkout return the sale the first attempt created.
 */
export async function createSale(input: CreateSaleInput): Promise<Sale> {
  const raw = await apiRequest<RawSale>("/sales", {
    method: "POST",
    body: {
      order_type: input.orderType,
      notes: input.notes?.trim() || undefined,
      promotion_code: input.promotionCode?.trim() || undefined,
      ...(input.fulfilment
        ? {
            fulfilment: {
              contact_phone: input.fulfilment.contactPhone?.trim() || undefined,
              address: input.fulfilment.address?.trim() || undefined,
            },
          }
        : {}),
      idempotency_key: input.idempotencyKey,
      items: input.items.map(toItemPayload),
    },
  });

  return mapSale(raw);
}

/**
 * `POST /sales/{id}/payments` — needs `sales.create`. Split payments go in one
 * batch; overpayment is returned as change. The key must stay stable across
 * retries so a replayed batch is not charged twice.
 */
export async function paySale({
  saleId,
  payments,
  idempotencyKey,
}: {
  saleId: string;
  payments: SalePaymentInput[];
  idempotencyKey: string;
}): Promise<Sale> {
  const raw = await apiRequest<RawSale>(
    `/sales/${encodeURIComponent(saleId)}/payments`,
    {
      method: "POST",
      body: {
        payments: payments.map((payment) => ({
          method: payment.method,
          amount: payment.amount,
          reference: payment.reference || undefined,
        })),
        idempotency_key: idempotencyKey,
      },
    },
  );

  return mapSale(raw);
}

/** `POST /sales/{id}/void` — needs `sales.void`. Restores stock and refunds payments. */
export async function voidSale(id: string, reason: string): Promise<Sale> {
  const raw = await apiRequest<RawSale>(`/sales/${encodeURIComponent(id)}/void`, {
    method: "POST",
    body: { reason },
  });

  return mapSale(raw);
}

/**
 * `POST /promotions/preview` — needs `sales.create`. Prices the cart without
 * writing anything, so the register can show real tax, promotion and loyalty
 * discounts before the cashier takes money.
 */
export async function previewCart({
  items,
  promotionCode,
  customerId,
}: {
  items: SaleLineInput[];
  promotionCode?: string | null;
  customerId?: string | null;
}): Promise<CartPreview> {
  const raw = await apiRequest<{
    subtotal: string;
    discount_amount: string;
    promotion: {
      id: number | string;
      name: string;
      code: string | null;
      type: string;
      value: string;
    } | null;
    promotion_discount: string;
    loyalty_discount: string;
    tax_amount: string;
    total: string;
  }>("/promotions/preview", {
    method: "POST",
    body: {
      promotion_code: promotionCode?.trim() || undefined,
      customer_id: customerId ? Number(customerId) : undefined,
      items: items.map(toItemPayload),
    },
  });

  return {
    subtotal: raw.subtotal,
    discountAmount: raw.discount_amount,
    promotion: raw.promotion
      ? {
          id: String(raw.promotion.id),
          name: raw.promotion.name,
          code: raw.promotion.code,
          type: raw.promotion.type,
          value: raw.promotion.value,
        }
      : null,
    promotionDiscount: raw.promotion_discount,
    loyaltyDiscount: raw.loyalty_discount,
    taxAmount: raw.tax_amount,
    total: raw.total,
  };
}
