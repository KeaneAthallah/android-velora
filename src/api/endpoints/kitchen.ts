import { apiRequest } from "@/api/client";

type RawTicket = {
  id: number | string;
  ticket_number: string;
  status: string;
  note?: string | null;
  items?: unknown;
  created_at: string;
  station?: { id: number | string; name: string; code?: string } | null;
  sale?: { id: number | string; order_number: string; order_type: string; order_status?: string; table?: string | null; notes?: string | null } | null;
};

export type KitchenTicket = {
  id: string;
  ticketNumber: string;
  status: string;
  note: string | null;
  items: unknown;
  createdAt: string;
  stationName: string;
  stationCode: string;
  orderNumber: string;
  orderType: string;
  table: string | null;
  saleId: string;
};

function mapTicket(raw: RawTicket): KitchenTicket {
  return {
    id: String(raw.id),
    ticketNumber: raw.ticket_number,
    status: raw.status,
    note: raw.note ?? null,
    items: raw.items ?? [],
    createdAt: raw.created_at,
    stationName: raw.station?.name ?? "Station",
    stationCode: raw.station?.code ?? "",
    orderNumber: raw.sale?.order_number ?? "",
    orderType: raw.sale?.order_type ?? "",
    table: raw.sale?.table ?? null,
    saleId: String(raw.sale?.id ?? ""),
  };
}

export async function fetchKitchenTickets(status: "active" | "all" = "active"): Promise<KitchenTicket[]> {
  const res = await apiRequest<{ tickets: RawTicket[]; counts?: Record<string, number> }>("/kitchen/tickets", {
    params: { status },
  });
  return (res.tickets ?? []).map(mapTicket);
}

export async function updateKitchenTicketStatus(id: string, status: "preparing" | "ready" | "served"): Promise<void> {
  await apiRequest(`/kitchen/tickets/${encodeURIComponent(id)}/status`, {
    method: "POST",
    body: { status },
  });
}