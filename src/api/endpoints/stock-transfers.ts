import { apiRequest } from "@/api/client";
import type { StockTransfer, StockTransferItem } from "@/api/types";

type RawItem = {
  id: number | string;
  product_id: number | string;
  quantity: string | number;
  product?: { name?: string | null } | null;
};

type RawTransfer = {
  id: number | string;
  from_outlet_id: number | string;
  to_outlet_id: number | string;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  items?: RawItem[];
};

function mapItem(raw: RawItem): StockTransferItem {
  return {
    id: String(raw.id),
    productId: String(raw.product_id),
    productName: raw.product?.name ?? `Product #${raw.product_id}`,
    quantity: String(raw.quantity ?? "0"),
  };
}

function mapTransfer(raw: RawTransfer): StockTransfer {
  return {
    id: String(raw.id),
    fromOutletId: String(raw.from_outlet_id),
    toOutletId: String(raw.to_outlet_id),
    status: raw.status ?? "draft",
    notes: raw.notes ?? null,
    createdAt: raw.created_at ?? "",
    completedAt: raw.completed_at ?? null,
    items: (raw.items ?? []).map(mapItem),
  };
}

/**
 * `GET /stock-transfers` — needs `inventory.view`. The API sends outlet ids
 * only, so the screen resolves names from the tenant's outlet list.
 */
export async function fetchStockTransfers(): Promise<StockTransfer[]> {
  const page = await apiRequest<{ data: RawTransfer[] }>("/stock-transfers");
  return (page.data ?? []).map(mapTransfer);
}

/**
 * `POST /stock-transfers/{id}/complete` — needs `inventory.adjust`. This is the
 * state change that actually moves stock out of one outlet and into the other.
 */
export async function completeStockTransfer(id: string): Promise<StockTransfer> {
  const raw = await apiRequest<RawTransfer>(
    `/stock-transfers/${encodeURIComponent(id)}/complete`,
    { method: "POST" },
  );
  return mapTransfer(raw);
}
