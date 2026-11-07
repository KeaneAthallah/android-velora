import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { ApiError } from "@/api/client";
import {
  createSale,
  paySale,
  type CreateSaleInput,
  type SaleLineInput,
  type SalePaymentInput,
} from "@/api/endpoints/sales";
import type { OrderType, Sale } from "@/api/types";
import { sumAmounts, toAmountString } from "@/lib/money";

export type CheckoutStage = "idle" | "creating" | "paying" | "done";

export type CheckoutRequest = {
  items: SaleLineInput[];
  orderType: OrderType;
  notes: string;
  promotionCode: string;
  payments: SalePaymentInput[];
  /** The total the cashier saw when they built the payment batch. */
  expectedTotal: string;
  fulfilment?: { contactPhone?: string; address?: string } | null;
};

/** `POST /sales` uses a unique key per checkout attempt (max 128 chars). */
export function newIdempotencyKey(): string {
  return Crypto.randomUUID();
}

/**
 * Two-phase, idempotent checkout.
 *
 * 1. `POST /sales` records the sale and returns the authoritative total.
 * 2. `POST /sales/{id}/payments` takes the money against that total.
 *
 * Both steps reuse stable idempotency keys, so a retry after a dropped
 * connection returns the sale/payments the first attempt created instead of
 * charging twice. If step 1 succeeded but step 2 failed, calling `submit`
 * again skips straight to the payment instead of creating a second sale.
 */
export function useCheckout() {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<CheckoutStage>("idle");
  const [saleId, setSaleId] = useState<string | null>(null);
  const saleIdRef = useRef<string | null>(null);
  const createdKeyRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  const reset = useCallback(() => {
    saleIdRef.current = null;
    createdKeyRef.current = null;
    inFlightRef.current = false;
    setSaleId(null);
    setStage("idle");
  }, []);

  const submit = useCallback(
    async (request: CheckoutRequest): Promise<Sale> => {
      // Guard against a double-tap firing two checkouts before React
      // re-renders the disabled button state.
      if (inFlightRef.current) {
        throw new ApiError({ message: "Checkout already in progress.", code: "IN_FLIGHT" });
      }
      inFlightRef.current = true;

      // Generate and remember the key before the first network call so a
      // retry after a dropped connection reuses it instead of creating a
      // second sale.
      if (!createdKeyRef.current) {
        createdKeyRef.current = newIdempotencyKey();
      }
      const saleKey = createdKeyRef.current;

      let saleId = saleIdRef.current;

      try {
        if (!saleId) {
          setStage("creating");
          const input: CreateSaleInput = {
            items: request.items,
            orderType: request.orderType,
            notes: request.notes,
            promotionCode: request.promotionCode,
            fulfilment: request.fulfilment ?? null,
            idempotencyKey: saleKey,
          };

          const created = await createSale(input);
          saleIdRef.current = created.id;
          setSaleId(created.id);
          saleId = created.id;

        // The server is the source of truth for the total. Refuse to guess a
        // payment for a cart whose price moved between preview and checkout.
        if (created.total !== request.expectedTotal) {
          const paid = sumAmounts(request.payments.map((payment) => payment.amount));
          if (
            request.payments.length !== 1 ||
            Number(paid) < Number(created.total)
          ) {
            throw new ApiError({
              message: `The server priced this sale at ${created.total}, not ${request.expectedTotal}. Review the payment before taking money.`,
              code: "TOTAL_CHANGED",
            });
          }
        }
      }

      setStage("paying");

      const paid = await paySale({
        saleId,
        payments: request.payments,
        idempotencyKey: `${saleKey}:payment`,
      });

      setStage("done");

      // A completed sale moves money, stock and report figures.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        // Ingredients were deducted, so both the recipes and the ingredient
        // dashboard are stale.
        queryClient.invalidateQueries({ queryKey: ["recipes"] }),
        queryClient.invalidateQueries({ queryKey: ["ingredients"] }),
      ]);

      return paid;
      } finally {
        inFlightRef.current = false;
      }
    },
    [queryClient],
  );

  return { stage, saleId, submit, reset };
}

/** Fit a payment batch to a server total for the one-tap "exact" case. */
export function exactPayment(
  method: string,
  total: string,
): SalePaymentInput {
  return { method, amount: toAmountString(Number(total)) };
}
