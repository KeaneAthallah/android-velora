import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { OrderType, Product } from "@/api/types";

/**
 * Local cart for the register.
 *
 * The cart is deliberately price-light: it keeps the catalogue price only as a
 * display hint for a line. Every total a cashier sees comes from
 * `POST /promotions/preview`, and the only authoritative total is the one the
 * server returns for the sale. Nothing here can charge a customer.
 */
export type CartLine = {
  /** `productId:variantId` — adding the same product/variant again merges. */
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  sku: string;
  /** Catalogue selling price, for the line label only. */
  unitPrice: string;
  quantity: number;
  /** Manual line discount in currency units ("" = none). */
  discount: string;
  notes: string | null;
};

type CartState = {
  /** `businessId:outletId` the lines belong to. */
  scope: string | null;
  lines: CartLine[];
  orderType: OrderType;
  promotionCode: string;
  notes: string;

  /** Drop the cart when the cashier switches business or outlet. */
  ensureScope: (scope: string | null) => void;
  addProduct: (product: Product, variantId?: string | null) => void;
  setQuantity: (key: string, quantity: number) => void;
  increment: (key: string) => void;
  decrement: (key: string) => void;
  setDiscount: (key: string, discount: string) => void;
  removeLine: (key: string) => void;
  clear: () => void;
  setOrderType: (orderType: OrderType) => void;
  setPromotionCode: (code: string) => void;
  setNotes: (notes: string) => void;
};

const MAX_QUANTITY = 999;

function lineKey(productId: string, variantId: string | null): string {
  return `${productId}:${variantId ?? ""}`;
}

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, Math.round(value * 1000) / 1000));
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      scope: null,
      lines: [],
      orderType: "takeaway",
      promotionCode: "",
      notes: "",

      ensureScope: (scope) => {
        if (get().scope === scope) return;
        set({
          scope,
          lines: [],
          orderType: "takeaway",
          promotionCode: "",
          notes: "",
        });
      },

      addProduct: (product, variantId) => {
        const variant =
          product.variants.find((item) => item.id === variantId) ?? null;
        const key = lineKey(product.id, variant?.id ?? null);
        const unitPrice = variant?.sellingPrice ?? product.sellingPrice;

        set((state) => {
          const existing = state.lines.find((line) => line.key === key);
          if (existing) {
            return {
              lines: state.lines.map((line) =>
                line.key === key
                  ? { ...line, quantity: clampQuantity(line.quantity + 1) }
                  : line,
              ),
            };
          }

          return {
            lines: [
              ...state.lines,
              {
                key,
                productId: product.id,
                variantId: variant?.id ?? null,
                name: product.name,
                variantName: variant?.name ?? null,
                sku: variant?.sku ?? product.sku,
                unitPrice,
                quantity: 1,
                discount: "",
                notes: null,
              },
            ],
          };
        });
      },

      setQuantity: (key, quantity) => {
        set((state) => ({
          lines: state.lines.map((line) =>
            line.key === key
              ? { ...line, quantity: clampQuantity(quantity) }
              : line,
          ),
        }));
      },

      increment: (key) => {
        const line = get().lines.find((item) => item.key === key);
        if (!line) return;
        get().setQuantity(key, line.quantity + 1);
      },

      decrement: (key) => {
        const line = get().lines.find((item) => item.key === key);
        if (!line) return;
        get().setQuantity(key, line.quantity - 1);
      },

      setDiscount: (key, discount) => {
        set((state) => ({
          lines: state.lines.map((line) =>
            line.key === key ? { ...line, discount } : line,
          ),
        }));
      },

      removeLine: (key) => {
        set((state) => ({ lines: state.lines.filter((line) => line.key !== key) }));
      },

      clear: () => {
        set({ lines: [], promotionCode: "", notes: "", orderType: "takeaway" });
      },

      setOrderType: (orderType) => set({ orderType }),
      setPromotionCode: (promotionCode) => set({ promotionCode }),
      setNotes: (notes) => set({ notes }),
    }),
    {
      name: "velora.cart.v1",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Only the basket survives a restart; transient flags stay in memory.
      partialize: (state) => ({
        scope: state.scope,
        lines: state.lines,
        orderType: state.orderType,
        promotionCode: state.promotionCode,
        notes: state.notes,
      }),
    },
  ),
);

export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}
