import { apiRequest } from "@/api/client";
import type { Paginated, Sale, SaleItem, SalePayment } from "@/api/types";

type RawSaleItem = {
  id: number | string;
  product_name: string;
  sku: string | null;
  quantity: string;
  unit_price: string;
  line_total: string;
};

type RawPayment = {
  id: number | string;
  method: string;
  amount: string;
  status: string;
};

type RawSale = {
  id: number | string;
  receipt_number: string;
  order_number: string;
  status: string;
  order_type: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total: string;
  paid_amount: string;
  created_at: string;
  items?: RawSaleItem[] | null;
  payments?: RawPayment[] | null;
};

function mapItem(raw: RawSaleItem): SaleItem {
  return {
    id: String(raw.id),
    productName: raw.product_name,
    sku: raw.sku ?? "",
    quantity: raw.quantity,
    unitPrice: raw.unit_price,
    lineTotal: raw.line_total,
  };
}

function mapPayment(raw: RawPayment): SalePayment {
  return {
    id: String(raw.id),
    method: raw.method,
    amount: raw.amount,
    status: raw.status,
  };
}

export function mapSale(raw: RawSale): Sale {
  return {
    id: String(raw.id),
    receiptNumber: raw.receipt_number,
    orderNumber: raw.order_number,
    status: raw.status,
    orderType: raw.order_type,
    subtotal: raw.subtotal,
    discountAmount: raw.discount_amount,
    taxAmount: raw.tax_amount,
    total: raw.total,
    paidAmount: raw.paid_amount,
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

/** `GET /sales/{id}` — needs `sales.view`. */
export async function fetchSale(id: string): Promise<Sale> {
  const raw = await apiRequest<RawSale>(`/sales/${encodeURIComponent(id)}`);
  return mapSale(raw);
}
