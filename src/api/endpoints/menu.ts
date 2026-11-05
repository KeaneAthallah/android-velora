import { apiRequest } from "@/api/client";
import { mapProduct } from "@/api/endpoints/products";
import type { MenuProduct } from "@/api/types";

type RawMenuProduct = Parameters<typeof mapProduct>[0] & {
  available?: boolean;
  unavailable_reason?: string | null;
};

type RawMenu = {
  outlet: { id: number | string; name: string };
  generated_at: string;
  products: RawMenuProduct[];
};

/**
 * `GET /menu` — needs `menu.view` and an outlet. The API returns the outlet's
 * live menu: every active product plus whether it can be sold there right now
 * (86'd, outside a daypart, or out of stock).
 */
export async function fetchMenu(outletId: string): Promise<MenuProduct[]> {
  const data = await apiRequest<RawMenu>("/menu", {
    params: { outlet_id: Number(outletId) },
  });

  return data.products.map((raw) => ({
    ...mapProduct(raw),
    available: raw.available !== false,
    unavailableReason: raw.unavailable_reason ?? null,
  }));
}

/**
 * `POST /menu/items/{product}/86` — needs `menu.availability`. A reason is
 * required because the register shows it to staff who try to sell the item.
 */
export async function markMenuItemUnavailable({
  productId,
  outletId,
  reason,
}: {
  productId: string;
  outletId: string;
  reason: string;
}): Promise<void> {
  await apiRequest(`/menu/items/${encodeURIComponent(productId)}/86`, {
    method: "POST",
    body: { outlet_id: Number(outletId), reason },
  });
}

/** `POST /menu/items/{product}/restore` — needs `menu.availability`. */
export async function restoreMenuItem({
  productId,
  outletId,
}: {
  productId: string;
  outletId: string;
}): Promise<void> {
  await apiRequest(`/menu/items/${encodeURIComponent(productId)}/restore`, {
    method: "POST",
    body: { outlet_id: Number(outletId) },
  });
}
