import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPaymentMethods } from "@/api/endpoints/payments";
import { previewCart, type SaleLineInput } from "@/api/endpoints/sales";
import type { CartPreview } from "@/api/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import type { CartLine } from "@/features/pos/cart-store";

/** Cart lines → the `items[]` shape `POST /sales` and the preview both take. */
export function toSaleLines(lines: CartLine[]): SaleLineInput[] {
  return lines.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    quantity: line.quantity,
    discount: line.discount,
    notes: line.notes,
  }));
}

export function usePaymentMethods() {
  const { has } = usePermissions();
  const { businessId } = useTenant();

  return useQuery({
    queryKey: queryKeys.paymentMethods(businessId),
    queryFn: fetchPaymentMethods,
    enabled: Boolean(businessId) && has("payments.view"),
    staleTime: 10 * 60 * 1_000,
  });
}

type PreviewPayload = {
  items: SaleLineInput[];
  promotionCode: string;
};

/**
 * Server-priced cart totals.
 *
 * The request is debounced so tapping "+" five times sends one preview, and a
 * stale response can never overwrite a newer cart: the query key carries the
 * exact payload it was priced from.
 */
export function useCartPreview({
  lines,
  promotionCode,
}: {
  lines: CartLine[];
  promotionCode: string;
}) {
  const { has } = usePermissions();
  const { businessId, outlet } = useTenant();

  const payload = useMemo<PreviewPayload>(
    () => ({ items: toSaleLines(lines), promotionCode: promotionCode.trim() }),
    [lines, promotionCode],
  );

  const serialized = JSON.stringify(payload);
  const debounced = useDebouncedValue(serialized, 250);

  const query = useQuery<CartPreview>({
    queryKey: queryKeys.cartPreview(businessId, outlet?.id ?? null, debounced),
    queryFn: () => {
      const priced = JSON.parse(debounced) as PreviewPayload;
      return previewCart({
        items: priced.items,
        promotionCode: priced.promotionCode,
      });
    },
    enabled:
      Boolean(businessId) &&
      Boolean(outlet?.id) &&
      lines.length > 0 &&
      has("sales.create"),
    staleTime: 30_000,
    retry: 1,
  });

  const settling = serialized !== debounced;

  return {
    preview: query.data,
    /** A newer cart has been typed than the totals on screen describe. */
    settling: settling || query.isFetching,
    error: query.isError ? query.error : null,
    refetch: query.refetch,
  };
}
