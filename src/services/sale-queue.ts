import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SaleLineInput } from "@/api/endpoints/sales";

const KEY = "velora.sale.queue.v1";

export type QueuedSale = {
  id: string;
  idempotencyKey: string;
  businessId: string;
  outletId: string;
  orderType: string;
  notes: string;
  promotionCode: string;
  items: SaleLineInput[];
  payments: { method: string; amount: string; reference?: string | null }[];
  expectedTotal: string;
  createdAt: number;
  status: "pending" | "failed";
  error?: string;
};

async function readQueue(): Promise<QueuedSale[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedSale[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedSale[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

export async function enqueueSale(sale: QueuedSale): Promise<void> {
  const queue = await readQueue();
  queue.push(sale);
  await writeQueue(queue);
}

export async function getQueuedSales(): Promise<QueuedSale[]> {
  return readQueue();
}

export async function removeQueuedSale(id: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((s) => s.id !== id));
}

export async function updateQueuedSale(sale: QueuedSale): Promise<void> {
  const queue = await readQueue();
  const idx = queue.findIndex((s) => s.id === sale.id);
  if (idx >= 0) queue[idx] = sale;
  await writeQueue(queue);
}

export async function queuedSaleCount(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}