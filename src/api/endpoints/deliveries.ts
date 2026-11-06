import { apiRequest } from "@/api/client";

export type DeliveryStatus =
  | "pending"
  | "scheduled"
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "failed"
  | "cancelled";

export type Delivery = {
  id: string;
  number: string;
  status: DeliveryStatus;
  recipientName: string;
  recipientPhone: string | null;
  address: string | null;
  fee: number;
  driverName: string | null;
};

export type DeliveryBoard = {
  date: string;
  totals: { count: number; delivered: number; unassigned: number; fees: number };
  columns: { status: DeliveryStatus; label: string; deliveries: Delivery[] }[];
};

type RawDelivery = {
  id: number | string;
  number?: string | null;
  status?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  address?: { line1?: string | null } | null;
  fee?: string | number | null;
  driver?: { name?: string | null } | null;
  driver_name?: string | null;
};

type RawBoard = {
  date?: string;
  totals?: {
    count?: number;
    delivered?: number;
    unassigned?: number;
    fees?: string | number | null;
  };
  columns?: {
    status?: string;
    label?: string;
    deliveries?: RawDelivery[];
  }[];
};

function mapDelivery(raw: RawDelivery): Delivery {
  return {
    id: String(raw.id),
    number: raw.number ?? "",
    status: (raw.status ?? "pending") as DeliveryStatus,
    recipientName: raw.recipient_name ?? "Guest",
    recipientPhone: raw.recipient_phone ?? null,
    address: raw.address?.line1 ?? null,
    fee: Number(raw.fee ?? 0),
    driverName: raw.driver?.name ?? raw.driver_name ?? null,
  };
}

export async function fetchDeliveryBoard(date?: string): Promise<DeliveryBoard> {
  const data = await apiRequest<RawBoard>(
    `/deliveries/board${date ? `?date=${encodeURIComponent(date)}` : ""}`,
  );

  return {
    date: data.date ?? date ?? new Date().toISOString().slice(0, 10),
    totals: {
      count: Number(data.totals?.count ?? 0),
      delivered: Number(data.totals?.delivered ?? 0),
      unassigned: Number(data.totals?.unassigned ?? 0),
      fees: Number(data.totals?.fees ?? 0),
    },
    columns: (data.columns ?? []).map((column) => ({
      status: (column.status ?? "pending") as DeliveryStatus,
      label: column.label ?? column.status ?? "Pending",
      deliveries: (column.deliveries ?? []).map(mapDelivery),
    })),
  };
}

export async function updateDeliveryStatus(
  id: string,
  status: DeliveryStatus,
): Promise<void> {
  await apiRequest(`/deliveries/${encodeURIComponent(id)}/status`, {
    method: "POST",
    body: { status },
  });
}
