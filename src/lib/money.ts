/**
 * Cashier-typed amounts → API-ready decimal strings.
 *
 * The API takes money as a numeric string with four decimal places, so every
 * value that leaves the register is rounded to 4dp here rather than being sent
 * as a float. Nothing in this file decides what a sale costs.
 */

/**
 * Parse what the cashier typed into a number of currency units.
 *
 * Handles `44000`, `44,000`, `44000.50`, `44.000,50` and a leading currency
 * symbol. Returns `null` when the text is not a usable amount.
 */
export function parseAmountInput(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");

  let value: number;

  if (lastDot >= 0 && lastComma >= 0) {
    // Both separators present: the later one is the decimal separator and the
    // other groups thousands (e.g. 1.234,50 or 1,234.50).
    const decimalIndex = Math.max(lastDot, lastComma);
    const whole = cleaned.slice(0, decimalIndex).replace(/[.,]/g, "");
    const fraction = cleaned.slice(decimalIndex + 1).replace(/[.,]/g, "");
    value = Number(`${whole || "0"}.${fraction}`);
  } else if (lastComma >= 0) {
    // A lone comma is a decimal separator when 1–2 digits follow it; otherwise
    // it is grouping (44,000).
    const digitsAfter = cleaned.length - lastComma - 1;
    value =
      digitsAfter === 1 || digitsAfter === 2
        ? Number(cleaned.replace(",", "."))
        : Number(cleaned.replace(/,/g, ""));
  } else {
    value = Number(cleaned);
  }

  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 10_000) / 10_000;
}

/** `44000` → `"44000.0000"`. */
export function toAmountString(value: number): string {
  return value.toFixed(4);
}

/** Sum of amounts already expressed as decimal strings, as a decimal string. */
export function sumAmounts(amounts: string[]): string {
  const total = amounts.reduce((sum, amount) => sum + Number(amount || 0), 0);
  return total.toFixed(4);
}
