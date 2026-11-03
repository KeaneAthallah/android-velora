import { apiRequest } from "@/api/client";

type RawBalance = {
  id: number | string;
  product_id: number | string;
  product_variant_id: number | string | null;
  quantity: string;
  reserved_quantity?: string | null;
  product?: { id: number | string; name: string; sku?: string | null } | null;
  variant?: { id: number | string; name: string; sku?: string | null } | null;
};

export type InventoryBalance = {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  variantId: string | null;
  variantName: string | null;
  variantSku: string | null;
  quantity: string;
  reservedQuantity: string;
};

function mapBalance(raw: RawBalance): InventoryBalance {
  return {
    id: String(raw.id),
    productId: String(raw.product_id),
    productName: raw.product?.name ?? "Unknown product",
    productSku: raw.product?.sku ?? "",
    variantId: raw.product_variant_id != null ? String(raw.product_variant_id) : null,
    variantName: raw.variant?.name ?? null,
    variantSku: raw.variant?.sku ?? null,
    quantity: raw.quantity,
    reservedQuantity: raw.reserved_quantity ?? "0",
  };
}

export async function fetchInventoryBalances(outletId?: string | null): Promise<InventoryBalance[]> {
  const page = await apiRequest<{ data: RawBalance[] }>("/inventory/balances", {
    params: { outlet_id: outletId ?? undefined, per_page: 100 },
  });
  return (page.data ?? []).map(mapBalance);
}

export async function adjustStock(input: {
  productId: string;
  variantId?: string | null;
  quantity: number;
  reason: string;
  type?: string;
}): Promise<void> {
  await apiRequest("/inventory/adjust", {
    method: "POST",
    body: {
      product_id: Number(input.productId),
      product_variant_id: input.variantId ? Number(input.variantId) : null,
      quantity: input.quantity,
      reason: input.reason,
      type: input.type ?? "adjustment",
    },
  });
}