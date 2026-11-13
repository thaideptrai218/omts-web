/**
 * Pure text helpers behind UnitInput. Display is vi-VN (dot groups thousands, comma is the decimal mark);
 * parsing also accepts a typed decimal dot ("0.5"). A single dot followed by exactly three digits after a
 * 1-3 digit integer ("1.250") is read as thousands grouping by default. Input drafts pass grouped=false
 * so a typed single dot is always decimal and does not change meaning when another digit is added.
 */
import { groupDigits } from "./money-text";

export type DecimalParse = { kind: "empty" } | { kind: "invalid" } | { kind: "ok"; value: number };

const GROUPED_DOTS = /^[1-9]\d{0,2}(\.\d{3})+$/;

/** 1250.5 -> "1.250,5"; trailing zeros of the fraction are dropped. */
export function formatDecimal(value: number, decimals: number): string {
  const [whole, fraction = ""] = Math.abs(value).toFixed(decimals).split(".");
  const trimmed = fraction.replace(/0+$/, "");
  const sign = value < 0 && (Number(whole) > 0 || trimmed) ? "-" : "";
  return `${sign}${groupDigits(whole)}${trimmed ? `,${trimmed}` : ""}`;
}

export function parseDecimalText(text: string, decimals: number, allowNegative = false, grouped = true): DecimalParse {
  const t = text.replace(/\s/g, "");
  if (!t) return { kind: "empty" };
  const negative = allowNegative && t.startsWith("-");
  const body = negative ? t.slice(1) : t;
  if (!/^[\d.,]+$/.test(body)) return { kind: "invalid" };
  const lastDot = body.lastIndexOf("."), lastComma = body.lastIndexOf(",");
  let normalized: string | null;
  if (lastDot >= 0 && lastComma >= 0) {
    // Both marks: the later one is the decimal mark, the other groups thousands.
    const mark = Math.max(lastDot, lastComma);
    const groupMark = lastDot > lastComma ? "," : ".";
    normalized = body.slice(0, mark).split(groupMark).join("").replace(/[.,]/g, "") + "." + body.slice(mark + 1);
  } else if (lastComma >= 0) {
    normalized = body.split(",").length === 2 ? body.replace(",", ".") : null;
  } else if (lastDot >= 0) {
    // While editing, a single dot always means a decimal mark; formatted display may group dots.
    const hasGroups = (grouped || body.split(".").length > 2) && GROUPED_DOTS.test(body);
    normalized = hasGroups ? body.replace(/\./g, "") : body.split(".").length === 2 ? body : null;
  } else normalized = body;
  if (normalized === null || !/^\d+(\.\d*)?$/.test(normalized)) return { kind: "invalid" };
  const factor = 10 ** decimals;
  const value = Math.round(Number(normalized) * factor) / factor;
  if (decimals === 0 && !Number.isInteger(Number(normalized))) return { kind: "invalid" };
  return Number.isFinite(value) ? { kind: "ok", value: negative ? -value : value } : { kind: "invalid" };
}
