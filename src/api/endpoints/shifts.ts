import { apiRequest } from "@/api/client";

type RawRegister = {
  id: number | string;
  name: string;
  code: string;
  outlet_id: number | string;
  status: string;
};

type RawShift = {
  id: number | string;
  status: string;
  opening_cash: string;
  expected_cash?: string | null;
  actual_cash?: string | null;
  difference?: string | null;
  opened_at: string;
  closed_at?: string | null;
  register?: { id: number | string; name: string; code: string } | null;
  cashier?: { id: number | string; name: string } | null;
};

export type CashRegister = {
  id: string;
  name: string;
  code: string;
  outletId: string;
  status: string;
};

export type Shift = {
  id: string;
  status: string;
  openingCash: string;
  expectedCash: string;
  countedCash: string | null;
  variance: string | null;
  openedAt: string;
  closedAt: string | null;
  registerName: string;
  registerCode: string;
  cashierName: string;
};

function mapRegister(raw: RawRegister): CashRegister {
  return {
    id: String(raw.id),
    name: raw.name,
    code: raw.code,
    outletId: String(raw.outlet_id),
    status: raw.status,
  };
}

function mapShift(raw: RawShift): Shift {
  return {
    id: String(raw.id),
    status: raw.status,
    openingCash: raw.opening_cash,
    expectedCash: raw.expected_cash ?? raw.opening_cash,
    countedCash: raw.actual_cash ?? null,
    variance: raw.difference ?? null,
    openedAt: raw.opened_at,
    closedAt: raw.closed_at ?? null,
    registerName: raw.register?.name ?? "Register",
    registerCode: raw.register?.code ?? "",
    cashierName: raw.cashier?.name ?? "Cashier",
  };
}

export async function fetchCashRegisters(): Promise<CashRegister[]> {
  const rows = await apiRequest<RawRegister[]>("/cash-registers");
  return (rows ?? []).map(mapRegister);
}

export async function fetchShifts(): Promise<Shift[]> {
  const page = await apiRequest<{ data: RawShift[] }>("/shifts", { params: { per_page: 50 } });
  return (page.data ?? []).map(mapShift);
}

export async function openShift(input: {
  cashRegisterId: string;
  openingCash: string;
  outletId?: string | null;
}): Promise<Shift> {
  const raw = await apiRequest<RawShift>("/shifts/open", {
    method: "POST",
    body: {
      cash_register_id: Number(input.cashRegisterId),
      opening_cash: Number(input.openingCash),
      outlet_id: input.outletId ? Number(input.outletId) : undefined,
    },
  });
  return mapShift(raw);
}

export async function closeShift(id: string, actualCash: string): Promise<Shift> {
  const raw = await apiRequest<RawShift>(`/shifts/${encodeURIComponent(id)}/close`, {
    method: "POST",
    body: { actual_cash: Number(actualCash) },
  });
  return mapShift(raw);
}