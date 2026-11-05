import { apiRequest } from "@/api/client";
import type { DiningArea, DiningTable, FloorPlan } from "@/api/types";

type RawArea = {
  id: number | string;
  outlet_id: number | string;
  name: string;
  sort_order: number;
};

type RawTable = {
  id: number | string;
  outlet_id: number | string;
  name: string;
  seats: number;
  shape: string;
  status: string;
  manual_status: string;
  occupied: boolean;
  is_active: boolean;
  notes: string | null;
  area: { id: number | string; name: string } | null;
  active_order: {
    id: number | string;
    order_number: string;
    order_status: string;
    total: string;
    items_count: number;
    created_at: string | null;
  } | null;
};

function mapArea(raw: RawArea): DiningArea {
  return {
    id: String(raw.id),
    outletId: String(raw.outlet_id),
    name: raw.name,
    sortOrder: raw.sort_order,
  };
}

export function mapTable(raw: RawTable): DiningTable {
  return {
    id: String(raw.id),
    outletId: String(raw.outlet_id),
    name: raw.name,
    seats: raw.seats,
    shape: raw.shape,
    status: raw.status,
    manualStatus: raw.manual_status,
    occupied: raw.occupied,
    isActive: raw.is_active,
    notes: raw.notes,
    areaId: raw.area ? String(raw.area.id) : null,
    areaName: raw.area?.name ?? "Unassigned",
    activeOrder: raw.active_order
      ? {
          id: String(raw.active_order.id),
          orderNumber: raw.active_order.order_number,
          orderStatus: raw.active_order.order_status,
          total: raw.active_order.total,
          itemsCount: raw.active_order.items_count,
          createdAt: raw.active_order.created_at,
        }
      : null,
  };
}

/** `GET /tables` — needs `tables.view`. Scoped to the active outlet when set. */
export async function fetchFloorPlan(
  outletId?: string | null,
): Promise<FloorPlan> {
  const data = await apiRequest<{ areas: RawArea[]; tables: RawTable[] }>(
    "/tables",
    {
      params: { outlet_id: outletId ? Number(outletId) : undefined },
    },
  );

  return {
    areas: data.areas.map(mapArea),
    tables: data.tables.map(mapTable),
  };
}

/**
 * `POST /tables/{table}/status` — needs `tables.manage`. The API refuses while
 * an open order occupies the table, so this is only for free tables.
 */
export async function updateTableStatus({
  tableId,
  status,
}: {
  tableId: string;
  status: string;
}): Promise<DiningTable> {
  const raw = await apiRequest<RawTable>(
    `/tables/${encodeURIComponent(tableId)}/status`,
    {
      method: "POST",
      body: { status },
    },
  );

  return mapTable(raw);
}
