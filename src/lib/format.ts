const ZERO_DECIMAL_CURRENCIES = new Set(["IDR", "JPY", "KRW", "VND", "CLP"]);

function fractionDigits(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}

/**
 * Format an API money string (`"44000.0000"`) for display. The API keeps four
 * decimal places; the UI shows the currency's usual precision.
 */
export function formatMoney(value: string | number | null | undefined, currency: string): string {
  if (value == null || value === "") return "—";
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return String(value);

  const digits = fractionDigits(currency);

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(digits)}`;
  }
}

/** `"18.0000"` → `"18"`, `"2.5000"` → `"2.5"`. */
export function formatQuantity(value: string | number | null | undefined): string {
  if (value == null || value === "") return "0";
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return amount.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

/** Grouped integer, e.g. `1,204`. */
export function formatCount(value: number): string {
  return value.toLocaleString();
}

/** `2026-11-04T01:20:00Z` → `04 Nov, 08:20` (device locale). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 16).replace("T", " ");
  }
}

/** `2026-11-04T01:20:00Z` → `04 Nov`. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Uppercase initials for an avatar tile. */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}
