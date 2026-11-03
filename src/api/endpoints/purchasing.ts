import { apiRequest } from "@/api/client";

type RawPoItem = {
  id: number | string;
  product_id: number | string;
  quantity: string;
  received_quantity?: string;
  unit_cost: string;
  product?: { id: number | string; name: string } | null;
};

type RawPo = {
  id: number | string;
  po_number: string;
  status: string;
  notes?: string | null;
  created_at: string;
  supplier?: { id: number | string; name: string } | null;
  items?: RawPoItem[] | null;
};

export type PurchaseOrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: string;
  receivedQuantity: string;
  unitCost: string;
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  status: string;
  notes: string | null;
  createdAt: string;
  supplierName: string;
  items: PurchaseOrderItem[];
};

function mapItem(raw: RawPoItem): PurchaseOrderItem {
  return {
    id: String(raw.id),
    productId: String(raw.product_id),
    productName: raw.product?.name ?? "Product",
    quantity: raw.quantity,
    receivedQuantity: raw.received_quantity ?? "0",
    unitCost: raw.unit_cost,
  };
}

function mapPo(raw: RawPo): PurchaseOrder {
  return {
    id: String(raw.id),
    poNumber: raw.po_number,
    status: raw.status,
    notes: raw.notes ?? null,
    createdAt: raw.created_at,
    supplierName: raw.supplier?.name ?? "Supplier",
    items: (raw.items ?? []).map(mapItem),
  };
}

export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  const page = await apiRequest<{ data: RawPo[] }>("/purchase-orders", { params: { per_page: 50 } });
  return (page.data ?? []).map(mapPo);
}

export async function approvePurchaseOrder(id: string): Promise<void> {
  await apiRequest(`/purchase-orders/${encodeURIComponent(id)}/approve`, { method: "POST" });
}

export async function receivePurchaseOrder(id: string, items: { purchaseOrderItemId: string; quantity: string }[]): Promise<void> {
  await apiRequest(`/purchase-orders/${encodeURIComponent(id)}/receive`, {
    method: "POST",
    body: {
      items: items.map((it) => ({
        purchase_order_item_id: Number(it.purchaseOrderItemId),
        quantity: Number(it.quantity),
      })),
    },
  });
}