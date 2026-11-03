import { apiRequest } from "@/api/client";
import type {
  Paginated,
  Product,
  ProductBarcode,
  ProductCategory,
  ProductVariant,
} from "@/api/types";

type RawCategory = {
  id: number | string;
  name: string;
  slug: string;
  parent_id: number | string | null;
};

type RawVariant = {
  id: number | string;
  name: string;
  sku: string;
  barcode: string | null;
  selling_price: string | null;
  cost_price: string | null;
  is_active: boolean;
};

type RawBarcode = {
  id: number | string;
  barcode: string;
  product_variant_id: number | string | null;
};

type RawProduct = {
  id: number | string;
  name: string;
  sku: string;
  description: string | null;
  unit: string | null;
  category_id: number | string | null;
  category?: RawCategory | null;
  cost_price: string | null;
  selling_price: string | null;
  track_inventory: boolean;
  is_active: boolean;
  is_combo?: boolean;
  variants?: RawVariant[] | null;
  barcodes?: RawBarcode[] | null;
};

function mapVariant(raw: RawVariant): ProductVariant {
  return {
    id: String(raw.id),
    name: raw.name,
    sku: raw.sku,
    barcode: raw.barcode,
    sellingPrice: raw.selling_price,
    costPrice: raw.cost_price,
    isActive: raw.is_active,
  };
}

function mapBarcode(raw: RawBarcode): ProductBarcode {
  return {
    id: String(raw.id),
    barcode: raw.barcode,
    variantId: raw.product_variant_id != null ? String(raw.product_variant_id) : null,
  };
}

export function mapProduct(raw: RawProduct): Product {
  return {
    id: String(raw.id),
    name: raw.name,
    sku: raw.sku,
    description: raw.description,
    unit: raw.unit ?? "pcs",
    categoryId: raw.category_id != null ? String(raw.category_id) : null,
    category: raw.category
      ? {
          id: String(raw.category.id),
          name: raw.category.name,
          slug: raw.category.slug,
          parentId:
            raw.category.parent_id != null ? String(raw.category.parent_id) : null,
        }
      : null,
    costPrice: raw.cost_price ?? "0",
    sellingPrice: raw.selling_price ?? "0",
    trackInventory: raw.track_inventory,
    isActive: raw.is_active,
    isCombo: raw.is_combo === true,
    variants: (raw.variants ?? []).map(mapVariant),
    barcodes: (raw.barcodes ?? []).map(mapBarcode),
  };
}

export type ProductFilters = {
  page?: number;
  perPage?: number;
  search?: string;
  categoryId?: string | null;
  isActive?: boolean;
};

export async function fetchProducts(
  filters: ProductFilters = {},
): Promise<Paginated<Product>> {
  const page = await apiRequest<Paginated<RawProduct>>("/products", {
    params: {
      page: filters.page ?? 1,
      per_page: filters.perPage ?? 24,
      search: filters.search?.trim() || undefined,
      category_id: filters.categoryId ?? undefined,
      is_active: filters.isActive === undefined ? undefined : filters.isActive ? 1 : 0,
    },
  });

  return {
    data: page.data.map(mapProduct),
    current_page: page.current_page,
    last_page: page.last_page,
    per_page: page.per_page,
    total: page.total,
  };
}

export async function fetchProduct(id: string): Promise<Product> {
  const raw = await apiRequest<RawProduct>(`/products/${encodeURIComponent(id)}`);
  return mapProduct(raw);
}

export async function fetchCategories(): Promise<ProductCategory[]> {
  const page = await apiRequest<Paginated<RawCategory>>("/categories", {
    params: { per_page: 100 },
  });

  return page.data.map((raw) => ({
    id: String(raw.id),
    name: raw.name,
    slug: raw.slug,
    parentId: raw.parent_id != null ? String(raw.parent_id) : null,
  }));
}
