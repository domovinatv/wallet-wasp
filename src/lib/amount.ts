// User-input → number normalization for amount fields.
// iOS shows the decimal keypad with the locale's separator (comma in hr-HR),
// viem parseUnits expects "1.5" form. This bridges the gap.

export type AmountParse =
  | { ok: true; normalized: string; numeric: number }
  | { ok: false; reason: "empty" | "invalid" | "zero" };

export function parseAmount(raw: string): AmountParse {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, reason: "empty" };

  const dotted = trimmed.replace(/,/g, ".");
  if ((dotted.match(/\./g) ?? []).length > 1)
    return { ok: false, reason: "invalid" };

  let cleaned = dotted.replace(/^0+(?=\d)/, "");
  if (cleaned.startsWith(".")) cleaned = "0" + cleaned;
  if (cleaned === "" || cleaned === ".")
    return { ok: false, reason: "invalid" };

  if (!/^\d+(\.\d+)?$/.test(cleaned)) return { ok: false, reason: "invalid" };

  const numeric = Number(cleaned);
  if (!isFinite(numeric)) return { ok: false, reason: "invalid" };
  if (numeric <= 0) return { ok: false, reason: "zero" };

  return { ok: true, normalized: cleaned, numeric };
}

export function isAmountInvalidForDisplay(raw: string): boolean {
  if (raw.trim().length === 0) return false;
  return !parseAmount(raw).ok;
}
