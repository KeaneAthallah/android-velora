import { apiRequest } from "@/api/client";
import type { PaymentMethod } from "@/api/types";

type RawPaymentMethod = {
  id: number | string;
  code: string;
  name: string;
  type: string;
  requires_reference: boolean;
  is_active: boolean;
  sort_order: number;
};

/**
 * `GET /payment-methods?active=1` — needs `payments.view`. The backend
 * provisions the default rails the first time this is called for a business.
 */
export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const rows = await apiRequest<RawPaymentMethod[]>("/payment-methods", {
    params: { active: 1 },
  });

  return rows.map((raw) => ({
    id: String(raw.id),
    code: raw.code,
    name: raw.name,
    type: raw.type,
    requiresReference: raw.requires_reference,
    isActive: raw.is_active,
    sortOrder: raw.sort_order,
  }));
}

/** True when a rail of this type accepts (and returns) physical cash. */
export function isCashMethod(method: PaymentMethod | undefined): boolean {
  return method?.type === "cash";
}
