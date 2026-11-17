/**
 * The backend stores a raft's size as free text (required, at most 100 characters). The web writes it as "10 m x 24 m" (length x width)
 * from two numeric inputs and reads that shape back; anything else stays readable as typed.
 */
const NUMBER = "(\\d{1,4}(?:[.,]\\d{1,2})?)";
const SIZE = new RegExp(`^\\s*${NUMBER}\\s*m?\\s*[x×*]\\s*${NUMBER}\\s*m?\\s*$`, "i");
const num = (text: string) => Number(text.replace(",", "."));
const show = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/** Length and width in metres, or undefined when the text is not of the "a m x b m" shape. */
export function parseRaftSize(text: string | null | undefined): { length: number; width: number } | undefined {
  const match = text ? SIZE.exec(text) : null;
  if (!match) return undefined;
  const length = num(match[1]), width = num(match[2]);
  return length > 0 && width > 0 ? { length, width } : undefined;
}

/** "10 m x 24 m" for two positive numbers (dot as decimal mark, as the backend text), "" otherwise. */
export function composeRaftSize(length: string, width: string): string {
  const l = num(length.trim() || "0"), w = num(width.trim() || "0");
  return Number.isFinite(l) && Number.isFinite(w) && l > 0 && w > 0 ? `${l} m x ${w} m` : "";
}

/** Display text with units: "10 m x 24 m (240 m²)"; a free text that does not parse is returned as written. */
export function formatRaftSize(text: string | null | undefined): string | null {
  const parsed = parseRaftSize(text);
  return parsed ? `${show(parsed.length)} m x ${show(parsed.width)} m (${show(parsed.length * parsed.width)} m²)` : text?.trim() || null;
}
