/**
 * Pure text helpers behind MoneyInput: vi-VN grouping (1.250.000), shortcut parsing
 * ("300k", "2tr", "1,5 triệu", "1 tỷ") and the optional "plain 1..999 means thousands" rule.
 */
import { MONEY_SYMBOL, formatVnd, formatVndWithSymbol, groupDigits } from "@/shared/format/vnd";

export { MONEY_SYMBOL, formatVnd, formatVndWithSymbol, groupDigits };

const SHORTCUT = /^(\d[\d.,]*)\s*(k|nghìn|nghin|ngàn|ngan|tr|triệu|trieu|tỷ|tỉ|ty|ti)$/u;
const FACTORS: Record<string, number> = {
  k: 1e3, nghìn: 1e3, nghin: 1e3, ngàn: 1e3, ngan: 1e3,
  tr: 1e6, triệu: 1e6, trieu: 1e6,
  tỷ: 1e9, tỉ: 1e9, ty: 1e9, ti: 1e9,
};

export type MoneyParse =
  | { kind: "empty" }
  | { kind: "invalid" }
  /** `scaled` tells how the text was interpreted: a typed unit word, or the autoThousands rule. */
  | { kind: "ok"; value: number; scaled: "unit" | "auto" | null };

/** "1,5" / "1.5" -> 1.5; with both separators the last one is the decimal mark. */
function decimalOf(raw: string): number {
  const lastDot = raw.lastIndexOf("."), lastComma = raw.lastIndexOf(",");
  const mark = Math.max(lastDot, lastComma);
  if (mark < 0) return Number(raw);
  const onlyOneKind = lastDot < 0 || lastComma < 0;
  if (onlyOneKind && raw.split(raw[mark]).length > 2) return Number(raw.replace(/[.,]/g, ""));
  return Number(`${raw.slice(0, mark).replace(/[.,]/g, "")}.${raw.slice(mark + 1)}`);
}

/** Plain digits, with or without grouping marks; a fraction is accepted only when it is all zeros. */
function plainInteger(text: string): number | null {
  if (/^\d+$/.test(text)) return Number(text);
  if (/^\d{1,3}([.,]\d{3})+$/.test(text)) return Number(text.replace(/[.,]/g, ""));
  const zeros = /^(\d+)[.,]0+$/.exec(text);
  return zeros ? Number(zeros[1]) : null;
}

export function parseMoneyText(text: string, autoThousands = false): MoneyParse {
  const t = text.normalize("NFC").trim().toLowerCase();
  if (!t) return { kind: "empty" };
  const shortcut = SHORTCUT.exec(t);
  if (shortcut) {
    const value = Math.round(decimalOf(shortcut[1]) * FACTORS[shortcut[2]]);
    return Number.isSafeInteger(value) ? { kind: "ok", value, scaled: "unit" } : { kind: "invalid" };
  }
  const plain = /^[\d.,\s]+$/.test(t) ? plainInteger(t.replace(/\s/g, "")) : null;
  if (plain === null || !Number.isSafeInteger(plain)) return { kind: "invalid" };
  if (autoThousands && plain >= 1 && plain <= 999) return { kind: "ok", value: plain * 1000, scaled: "auto" };
  return { kind: "ok", value: plain, scaled: null };
}
