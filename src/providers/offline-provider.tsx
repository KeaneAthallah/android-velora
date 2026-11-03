import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createSale, paySale } from "@/api/endpoints/sales";
import { errorMessage, isNetworkError } from "@/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/providers/toast";
import { useIsOnline } from "@/services/connectivity";
import { getQueuedSales, removeQueuedSale, updateQueuedSale, type QueuedSale } from "@/services/sale-queue";

type OfflineContextValue = {
  isOnline: boolean;
  queuedCount: number;
  enqueue: (sale: QueuedSale) => Promise<void>;
  replay: () => Promise<void>;
  discard: (id: string) => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used within OfflineProvider");
  return ctx;
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isOnline = useIsOnline();
  const [queuedCount, setQueuedCount] = useState(0);
  const replayingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    const q = await getQueuedSales();
    setQueuedCount(q.length);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void refreshCount(), 0);
    return () => clearTimeout(timer);
  }, [refreshCount]);

  const enqueue = useCallback(async (sale: QueuedSale) => {
    await (await import("@/services/sale-queue")).enqueueSale(sale);
    await refreshCount();
  }, [refreshCount]);

  const replay = useCallback(async () => {
    if (replayingRef.current || !isOnline) return;
    replayingRef.current = true;
    try {
      const queue = await getQueuedSales();
      for (const sale of queue) {
        try {
          const created = await createSale({
            items: sale.items,
            orderType: sale.orderType as "dine_in" | "takeaway" | "delivery" | "pickup",
            notes: sale.notes,
            promotionCode: sale.promotionCode,
            idempotencyKey: sale.idempotencyKey,
            fulfilment: null,
          });
          if (sale.payments.length > 0) {
            await paySale({
              saleId: created.id,
              payments: sale.payments,
              idempotencyKey: `${sale.idempotencyKey}:payment`,
            });
          }
          await removeQueuedSale(sale.id);
          await refreshCount();
          showToast("Queued sale synced", "success");
        } catch (e) {
          if (isNetworkError(e)) {
            // stop replaying; will retry later
            break;
          }
          sale.status = "failed";
          sale.error = errorMessage(e, "Sale rejected by server");
          await updateQueuedSale(sale);
          await refreshCount();
          showToast(sale.error, "danger");
        }
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
    } finally {
      replayingRef.current = false;
    }
  }, [isOnline, queryClient, refreshCount, showToast]);

  // Auto-replay when coming back online
  useEffect(() => {
    if (isOnline) void replay();
  }, [isOnline, replay]);

  const discard = useCallback(async (id: string) => {
    await removeQueuedSale(id);
    await refreshCount();
  }, [refreshCount]);

  return (
    <OfflineContext.Provider value={{ isOnline, queuedCount, enqueue, replay, discard }}>
      {children}
    </OfflineContext.Provider>
  );
}