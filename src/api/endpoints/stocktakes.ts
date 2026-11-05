import { apiRequest } from "@/api/client";
import type { Stocktake, StocktakeItem } from "@/api/types";

type RawItem = {
  id: number | string;
  product_id: number | string;
  expected_quantity?: string | number | null;
  counted_quantity?: string | number | null;
  product?: { name?: string | null; sku?: string | null } | null;
};

type RawStocktake = {
  id: number | string;
  outlet_id: number | string;
  outlet?: { name?: string | null } | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  items?: RawItem[];
};

function mapItem(raw: RawItem): StocktakeItem {
  return {
    id: String(raw.id),
    productId: String(raw.product_id),
    productName: raw.product?.name ?? `Product #${raw.product_id}`,
    sku: raw.product?.sku ?? null,
    expectedQuantity: String(raw.expected_quantity ?? "0"),
    countedQuantity: String(raw.counted_quantity ?? "0"),
  };
}

function mapStocktake(raw: RawStocktake): Stocktake {
  return {
    id: String(raw.id),
    outletId: String(raw.outlet_id),
    outletName: raw.outlet?.name ?? null,
    status: raw.status ?? "draft",
    notes: raw.notes ?? null,
    createdAt: raw.created_at ?? "",
    completedAt: raw.completed_at ?? null,
    items: (raw.items ?? []).map(mapItem),
  };
}

/** `GET /stocktakes` — needs `inventory.view`, newest first. */
export async function fetchStocktakes(): Promise<Stocktake[]> {
  const page = await apiRequest<{ data: RawStocktake[] }>("/stocktakes");
  return (page.data ?? []).map(mapStocktake);
}

/** `GET /stocktakes/{id}` — needs `inventory.view`; carries the counted lines. */
export async function fetchStocktake(id: string): Promise<Stocktake> {
  const raw = await apiRequest<RawStocktake>(
    `/stocktakes/${encodeURIComponent(id)}`,
  );
  return mapStocktake(raw);
}

/**
 * `POST /stocktakes` — needs `inventory.adjust`. Snapshots the outlet's tracked
 * products at their current balance, which is what the count is measured against.
 */
export async function createStocktake({
  outletId,
  notes,
}: {
  outletId: string;
  notes?: string;
}): Promise<Stocktake> {
  const raw = await apiRequest<RawStocktake>("/stocktakes", {
    method: "POST",
    body: { outlet_id: Number(outletId), notes: notes || null },
  });
  return mapStocktake(raw);
}

/**
 * `PUT /stocktakes/{id}` — needs `inventory.adjust`. Saves the counted
 * quantities and moves a draft to `in_progress`.
 */
export async function saveStocktakeCounts({
  id,
  items,
  notes,
}: {
  id: string;
  items: { id: string; countedQuantity: number }[];
  notes?: string;
}): Promise<Stocktake> {
  const raw = await apiRequest<RawStocktake>(
    `/stocktakes/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: {
        notes,
        items: items.map((item) => ({
          id: Number(item.id),
          counted_quantity: item.countedQuantity,
        })),
      },
    },
  );
  return mapStocktake(raw);
}

async function closeStocktake(
  id: string,
  action: "post" | "cancel",
  options: { confirmZeroCount?: boolean } = {},
): Promise<Stocktake> {
  const raw = await apiRequest<RawStocktake>(
    `/stocktakes/${encodeURIComponent(id)}/${action}`,
    {
      method: "POST",
      // Posting an all-zero count writes off the outlet's stock; the API only
      // accepts it once the wipe is explicitly acknowledged.
      body:
        action === "post" && options.confirmZeroCount
          ? { confirm_zero_count: true }
          : undefined,
    },
  );
  return mapStocktake(raw);
}

/** `POST /stocktakes/{id}/post` — needs `inventory.adjust`. Writes the variance. */
export function postStocktake(
  id: string,
  options: { confirmZeroCount?: boolean } = {},
): Promise<Stocktake> {
  return closeStocktake(id, "post", options);
}

/** `POST /stocktakes/{id}/cancel` — needs `inventory.adjust`. Posts no movement. */
export function cancelStocktake(id: string): Promise<Stocktake> {
  return closeStocktake(id, "cancel");
}
