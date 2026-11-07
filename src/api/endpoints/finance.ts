import { apiRequest } from "@/api/client";

export type FinancialSummary = {
  period: { from: string; to: string };
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  otherIncome: number;
  netProfit: number;
  taxCollected: number;
  refunds: number;
  cashCollected: number;
  accountsReceivable: number;
  accountsPayable: number;
  grossMarginPercent: number | null;
};

export type AgingBuckets = {
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  over90: number;
  total: number;
};

type RawSummary = {
  period?: { from?: string; to?: string };
  revenue?: string | number | null;
  cogs?: string | number | null;
  gross_profit?: string | number | null;
  operating_expenses?: string | number | null;
  other_income?: string | number | null;
  net_profit?: string | number | null;
  tax_collected?: string | number | null;
  refunds?: string | number | null;
  cash_collected?: string | number | null;
  accounts_receivable?: string | number | null;
  accounts_payable?: string | number | null;
  gross_margin_percent?: number | string | null;
};

type RawAging = {
  buckets?: {
    current?: number | string | null;
    "1_30"?: number | string | null;
    "31_60"?: number | string | null;
    "61_90"?: number | string | null;
    over_90?: number | string | null;
  };
  total?: number | string | null;
};

function num(value: string | number | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * `GET /analytics/financial` — needs `analytics.view`.
 * Revenue, profit, cash collected and outstanding AR/AP for the period.
 */
export async function fetchFinancialSummary({
  from,
  to,
  outletId,
}: {
  from?: string;
  to?: string;
  outletId?: string | null;
} = {}): Promise<FinancialSummary> {
  const raw = await apiRequest<RawSummary>("/analytics/financial", {
    params: { from, to, outlet_id: outletId ?? undefined },
  });

  return {
    period: { from: raw.period?.from ?? from ?? "", to: raw.period?.to ?? to ?? "" },
    revenue: num(raw.revenue),
    cogs: num(raw.cogs),
    grossProfit: num(raw.gross_profit),
    operatingExpenses: num(raw.operating_expenses),
    otherIncome: num(raw.other_income),
    netProfit: num(raw.net_profit),
    taxCollected: num(raw.tax_collected),
    refunds: num(raw.refunds),
    cashCollected: num(raw.cash_collected),
    accountsReceivable: num(raw.accounts_receivable),
    accountsPayable: num(raw.accounts_payable),
    grossMarginPercent:
      raw.gross_margin_percent == null ? null : num(raw.gross_margin_percent),
  };
}

/** `GET /ar-aging` needs `ar.view`; `GET /ap-aging` needs `ap.view`. */
export async function fetchAging(kind: "ar" | "ap"): Promise<AgingBuckets> {
  const raw = await apiRequest<RawAging>(`/${kind}-aging`);
  const buckets = raw.buckets ?? {};

  return {
    current: num(buckets.current),
    days1To30: num(buckets["1_30"]),
    days31To60: num(buckets["31_60"]),
    days61To90: num(buckets["61_90"]),
    over90: num(buckets.over_90),
    total: num(raw.total),
  };
}
