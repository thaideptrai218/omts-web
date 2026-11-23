import { visibleRows, type EodDocument, type EodRow, type EodTable, type OpenState } from "../end-of-day-model";
import type { FlowItem } from "./paginate";

/** Đầu báo cáo: ngày lập, tiêu đề và các dòng điều kiện lọc (chỉ ở trang 1). */
export type PaperHead = Readonly<{ createdAt: string; title: string; lines: readonly string[] }>;

/** Một phần tử của dòng chảy trong trang giấy (trước khi chia trang). */
export type FlowEntry =
  | Readonly<{ key: "head"; type: "head"; head: PaperHead }>
  | Readonly<{ key: string; type: "tableTitle"; table: EodTable }>
  | Readonly<{ key: string; type: "row"; table: EodTable; row: EodRow }>
  | Readonly<{ key: string; type: "total"; table: EodTable }>
  | Readonly<{ key: string; type: "empty"; table: EodTable }>
  | Readonly<{ key: "note"; type: "note"; text: string }>;

/** Dòng chảy của toàn báo cáo: đầu báo cáo, rồi từng bảng (tiêu đề bảng, các dòng đang hiện, dòng tổng) và ghi chú. Dòng của đoạn đóng bị bỏ. */
export function buildFlow(doc: EodDocument, state: OpenState, head: PaperHead): FlowEntry[] {
  const entries: FlowEntry[] = [{ key: "head", type: "head", head }];
  for (const table of doc.tables) {
    entries.push({ key: `title:${table.id}`, type: "tableTitle", table });
    const rows = visibleRows(table, state);
    if (!rows.length) { entries.push({ key: `empty:${table.id}`, type: "empty", table }); continue; }
    for (const row of rows) entries.push({ key: row.key, type: "row", table, row });
    if (table.total) entries.push({ key: `total:${table.id}`, type: "total", table });
  }
  if (doc.note) entries.push({ key: "note", type: "note", text: doc.note });
  return entries;
}

/** Chuỗi chữ của từng ô/dòng của một phần tử, theo đúng thứ tự hiển thị (dùng cho tìm kiếm trong trang). */
export function entryTexts(entry: FlowEntry): string[] {
  switch (entry.type) {
    case "head": return [entry.head.title, ...entry.head.lines];
    case "tableTitle": return [entry.table.title];
    case "row": return entry.row.cells.map((item) => item.text);
    case "total": return (entry.table.total ?? []).map((item) => item.text);
    case "empty": return [entry.table.emptyText];
    case "note": return [entry.text];
  }
}

/** Ghép chiều cao đã đo vào dòng chảy: đầu báo cáo và tiêu đề bảng đi cùng phần tử sau (không bị bỏ lại cuối trang); khóa chưa đo coi là 0. */
export function toFlowItems(entries: readonly FlowEntry[], heights: ReadonlyMap<string, number>): FlowItem[] {
  return entries.map((entry) => ({
    key: entry.key, height: heights.get(entry.key) ?? 0, keepWithNext: entry.type === "head" || entry.type === "tableTitle",
    table: entry.type === "row" || entry.type === "total" ? entry.table.id : undefined,
  }));
}

/** Khóa đo chiều cao dòng tiêu đề của một bảng. */
export const headerKey = (tableId: string) => `thead:${tableId}`;

/** Chiều cao dòng tiêu đề của từng bảng, lấy từ bảng chiều cao đã đo. */
export function headerHeights(doc: EodDocument, heights: ReadonlyMap<string, number>): Record<string, number> {
  return Object.fromEntries(doc.tables.map((table) => [table.id, heights.get(headerKey(table.id)) ?? 0]));
}
