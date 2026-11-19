import { entryTexts, type FlowEntry } from "./paper-flow";
import type { PagePlan } from "./paginate";

/** Một lần xuất hiện của từ khóa: phần tử, ô trong phần tử và thứ tự lần xuất hiện trong ô đó. */
export type SearchMatch = Readonly<{ key: string; cell: number; nth: number; page: number }>;
export type TextPart = Readonly<{ text: string; hit: boolean }>;

/** Chữ thường bỏ dấu tiếng Việt, từng ký tự một để chỉ số khớp với chuỗi gốc. */
export function foldText(text: string): string {
  let out = "";
  for (const ch of text) {
    const folded = ch.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace("đ", "d");
    out += folded.length === ch.length ? folded : ch;
  }
  return out;
}

const hitRanges = (text: string, query: string): number[] => {
  const needle = foldText(query.trim()), haystack = foldText(text), found: number[] = [];
  if (!needle) return found;
  for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + needle.length)) found.push(at);
  return found;
};

/** Cắt chuỗi thành các đoạn khớp / không khớp từ khóa (không phân biệt hoa thường và dấu) để tô sáng. */
export function splitMatches(text: string, query: string): TextPart[] {
  const starts = hitRanges(text, query), length = query.trim().length;
  if (!starts.length) return [{ text, hit: false }];
  const parts: TextPart[] = [];
  let cursor = 0;
  for (const start of starts) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), hit: false });
    parts.push({ text: text.slice(start, start + length), hit: true });
    cursor = start + length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false });
  return parts;
}

/** Mọi lần khớp từ khóa trong dòng chảy, theo thứ tự hiển thị từ trang đầu; phần tử chưa nằm trong trang nào bị bỏ qua. */
export function findMatches(entries: readonly FlowEntry[], pages: readonly PagePlan[], query: string): SearchMatch[] {
  if (!query.trim()) return [];
  const pageOf = new Map<string, number>();
  pages.forEach((page, index) => page.keys.forEach((key) => pageOf.set(key, index + 1)));
  return entries.flatMap((entry) => {
    const page = pageOf.get(entry.key);
    if (page === undefined) return [];
    return entryTexts(entry).flatMap((text, cell) => hitRanges(text, query).map((_, nth) => ({ key: entry.key, cell, nth, page })));
  });
}

/** Lần khớp kế tiếp (+1) hoặc trước đó (-1), quay vòng. */
export const stepMatch = (current: number, delta: 1 | -1, total: number): number => total ? (current + delta + total) % total : 0;
