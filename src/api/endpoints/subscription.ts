import { apiRequest } from "@/api/client";
import type { SubscriptionDetail, SubscriptionUsageMetric } from "@/api/types";

type RawUsage = {
  metric: string;
  label: string;
  used?: number | null;
  limit?: number | null;
  remaining?: number | null;
  percent?: number | null;
  unlimited?: boolean | null;
};

type RawSubscription = {
  subscription?: {
    status?: string | null;
    is_active?: boolean | null;
    billing_period?: string | null;
    trial_days_remaining?: number | null;
    trial_ends_at?: string | null;
    current_period_end?: string | null;
    days_remaining?: number | null;
    cancel_at_period_end?: boolean | null;
    price_amount?: number | null;
    currency?: string | null;
  } | null;
  plan?: { name?: string | null; description?: string | null } | null;
  usage?: RawUsage[];
  features?: Record<string, unknown> | null;
};

function mapUsage(raw: RawUsage): SubscriptionUsageMetric {
  return {
    metric: raw.metric,
    label: raw.label,
    used: raw.used ?? 0,
    limit: raw.limit ?? null,
    remaining: raw.remaining ?? null,
    percent: raw.percent ?? 0,
    unlimited: raw.unlimited === true || raw.limit == null,
  };
}

/**
 * `GET /subscription` — the plan, period and usage meters for the active
 * business. Read-only here: checkout, plan changes and invoices stay on web.
 */
export async function fetchSubscriptionDetail(): Promise<SubscriptionDetail> {
  const raw = await apiRequest<RawSubscription>("/subscription");
  const subscription = raw.subscription ?? {};

  return {
    planName: raw.plan?.name ?? null,
    planDescription: raw.plan?.description ?? null,
    status: subscription.status ?? "inactive",
    isActive: subscription.is_active === true,
    billingPeriod: subscription.billing_period ?? "monthly",
    priceAmount: subscription.price_amount ?? null,
    currency: subscription.currency ?? null,
    trialDaysRemaining: subscription.trial_days_remaining ?? 0,
    trialEndsAt: subscription.trial_ends_at ?? null,
    currentPeriodEnd: subscription.current_period_end ?? null,
    daysRemaining: subscription.days_remaining ?? 0,
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    usage: (raw.usage ?? []).map(mapUsage),
    features: Object.entries(raw.features ?? {}).map(([key, value]) => ({
      key,
      enabled: value === true,
    })),
  };
}
