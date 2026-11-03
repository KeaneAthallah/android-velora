import { apiRequest } from "@/api/client";
import type {
  InventoryBalance,
  ProductSalesRow,
  SalesSummary,
} from "@/api/types";

type RawSummary = {
  count: number | string;
  gross_sales: string;
  discounts: string;
  tax: string;
  net_sales: string;
  paid: string;
};

type RawLowStock = {
  id: number | string;
  outlet_id: number | string;
  product_id: number | string;
  product_variant_id: number | string | null;
  quantity: string;
  reserved_quantity: string;
  product?: { name?: string; sku?: string; unit?: string | null } | null;
};

type RawProductSales = {
  product_id: number | string | null;
  product_name: string | null;
  qty: string | number;
  total: string;
};

type RangeParams = {
  outletId?: string | null;
  from?: string;
  to?: string;
};

/** `GET /reports/sales-summary` — needs `reports.view`. */
export async function fetchSalesSummary({
  outletId,
  from,
  to,
}: RangeParams = {}): Promise<SalesSummary> {
  const raw = await apiRequest<RawSummary>("/reports/sales-summary", {
    params: { outlet_id: outletId ?? undefined, from, to },
  });

  return {
    count: Number(raw.count) || 0,
    grossSales: raw.gross_sales,
    discounts: raw.discounts,
    tax: raw.tax,
    netSales: raw.net_sales,
    paid: raw.paid,
  };
}

/** `GET /reports/low-stock` — needs `inventory.view`. */
export async function fetchLowStock({
  outletId,
  threshold = 5,
}: {
  outletId?: string | null;
  threshold?: number;
} = {}): Promise<InventoryBalance[]> {
  const rows = await apiRequest<RawLowStock[]>("/reports/low-stock", {
    params: { outlet_id: outletId ?? undefined, threshold },
  });

  return rows.map((row) => ({
    id: String(row.id),
    outletId: String(row.outlet_id),
    productId: String(row.product_id),
    variantId:
      row.product_variant_id != null ? String(row.product_variant_id) : null,
    quantity: row.quantity,
    reservedQuantity: row.reserved_quantity,
    productName: row.product?.name ?? "Product",
    productSku: row.product?.sku ?? "",
    productUnit: row.product?.unit ?? "pcs",
  }));
}

/** `GET /reports/sales-by-product` — needs `reports.view`. */
export async function fetchSalesByProduct({
  outletId,
  from,
  to,
}: RangeParams = {}): Promise<ProductSalesRow[]> {
  const rows = await apiRequest<RawProductSales[]>("/reports/sales-by-product", {
    params: { outlet_id: outletId ?? undefined, from, to },
  });

  return rows
    .filter((row) => row.product_id != null)
    .map((row) => ({
      productId: String(row.product_id),
      productName: row.product_name ?? "Product",
      quantity: String(row.qty),
      total: String(row.total),
    }));
}
