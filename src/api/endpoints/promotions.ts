import { apiRequest } from "@/api/client";
import type { Promotion } from "@/api/types";

type RawPromotion = {
  id: number | string;
  name: string;
  code?: string | null;
  description?: string | null;
  type?: string | null;
  value?: string | number | null;
  min_spend?: string | number | null;
  max_discount?: string | number | null;
  usage_limit?: number | null;
  usage_count?: number | null;
  per_customer_limit?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean | null;
};

function mapPromotion(raw: RawPromotion): Promotion {
  return {
    id: String(raw.id),
    name: raw.name,
    code: raw.code ?? null,
    description: raw.description ?? null,
    type: raw.type === "fixed" ? "fixed" : "percentage",
    value: String(raw.value ?? "0"),
    minSpend: raw.min_spend == null ? null : String(raw.min_spend),
    maxDiscount: raw.max_discount == null ? null : String(raw.max_discount),
    usageLimit: raw.usage_limit ?? null,
    usageCount: raw.usage_count ?? 0,
    perCustomerLimit: raw.per_customer_limit ?? null,
    startsAt: raw.starts_at ?? null,
    endsAt: raw.ends_at ?? null,
    active: raw.is_active !== false,
  };
}

/** `GET /promotions` — needs `promotions.view`. Not paginated by the API. */
export async function fetchPromotions(): Promise<Promotion[]> {
  const data = await apiRequest<RawPromotion[]>("/promotions");
  return (Array.isArray(data) ? data : []).map(mapPromotion);
}

/**
 * `PUT /promotions/{id}` — needs `promotions.manage`. The endpoint expects the
 * whole record, so the caller passes back what it read and only flips `active`.
 */
export async function setPromotionActive(
  promotion: Promotion,
  active: boolean,
): Promise<Promotion> {
  const raw = await apiRequest<RawPromotion>(
    `/promotions/${encodeURIComponent(promotion.id)}`,
    {
      method: "PUT",
      body: {
        name: promotion.name,
        code: promotion.code,
        description: promotion.description,
        type: promotion.type,
        value: Number(promotion.value),
        min_spend: promotion.minSpend == null ? null : Number(promotion.minSpend),
        max_discount:
          promotion.maxDiscount == null ? null : Number(promotion.maxDiscount),
        usage_limit: promotion.usageLimit,
        per_customer_limit: promotion.perCustomerLimit,
        starts_at: promotion.startsAt,
        ends_at: promotion.endsAt,
        is_active: active,
      },
    },
  );

  return mapPromotion(raw);
}
