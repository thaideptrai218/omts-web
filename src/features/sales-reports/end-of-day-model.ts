import type { ReportTile } from "./report-parts";

/**
 * Mô hình tài liệu của báo cáo Cuối ngày, dùng chung cho Dạng bảng và Dạng Báo cáo (trang giấy): các bảng với cột, dòng và dòng tổng.
 * Mỗi dòng đã là chữ hiển thị (ô có thể kèm đường dẫn); dòng "group"/"item" có `toggle` thì mở/đóng được các dòng con (`parent` trỏ về khóa của nó).
 */
export type EodCell = Readonly<{ text: string; href?: string; strong?: boolean }>;
export type EodColumn = Readonly<{ key: string; header: string; numeric?: boolean; /** Tỉ lệ độ rộng so với các cột khác. */ width: number }>;
export type EodRow = Readonly<{
  key: string; role: "group" | "item" | "detail"; cells: readonly EodCell[];
  /** Có mặt = dòng bấm ⊞/⊟ được; `defaultOpen` là trạng thái khi người dùng chưa bấm. */
  toggle?: Readonly<{ defaultOpen: boolean }>;
  /** Khóa của dòng cha: chỉ hiện khi dòng cha đang mở. */
  parent?: string;
}>;
export type EodTable = Readonly<{ id: string; title: string; columns: readonly EodColumn[]; rows: readonly EodRow[]; total?: readonly EodCell[]; emptyText: string }>;
export type EodDocument = Readonly<{ tiles: readonly ReportTile[]; tables: readonly EodTable[]; note?: string }>;
/** Trạng thái mở/đóng người dùng đã bấm, theo khóa dòng; dòng chưa bấm dùng `defaultOpen`. */
export type OpenState = Readonly<Record<string, boolean>>;

export const cell = (text: string, extra: Omit<EodCell, "text"> = {}): EodCell => ({ text, ...extra });

export const isOpen = (row: EodRow, state: OpenState): boolean => state[row.key] ?? row.toggle?.defaultOpen ?? true;

/** Trạng thái sau khi bấm ⊞/⊟ ở dòng `key`: đảo mở/đóng so với trạng thái hiện tại (kể cả mặc định). */
export function flipOpen(doc: EodDocument, state: OpenState, key: string): OpenState {
  const row = doc.tables.flatMap((table) => table.rows).find((item) => item.key === key);
  return row ? { ...state, [key]: !isOpen(row, state) } : state;
}

/** Các dòng đang hiện của một bảng: dòng con của dòng đang đóng bị ẩn. */
export function visibleRows(table: EodTable, state: OpenState): EodRow[] {
  const byKey = new Map(table.rows.map((row) => [row.key, row]));
  return table.rows.filter((row) => { const parent = row.parent ? byKey.get(row.parent) : undefined; return !parent || isOpen(parent, state); });
}

/** Khóa các dòng sản phẩm mở được (báo cáo Hàng hóa): nền của nút "Mở/Thu gọn tất cả" và của tham số `expanded` khi xuất. */
export const toggleKeys = (doc: EodDocument): string[] => doc.tables.flatMap((table) => table.rows.filter((row) => row.toggle).map((row) => row.key));

/** Tất cả dòng mở được đang mở (và có ít nhất một dòng). */
export const allOpen = (doc: EodDocument, state: OpenState): boolean => {
  const rows = doc.tables.flatMap((table) => table.rows.filter((row) => row.toggle));
  return rows.length > 0 && rows.every((row) => isOpen(row, state));
};

/** Mở hoặc đóng tất cả dòng mở được. */
export const setAllOpen = (doc: EodDocument, open: boolean): OpenState => Object.fromEntries(toggleKeys(doc).map((key) => [key, open]));

const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
/** Mốc thời gian backend trả (có múi giờ, hoặc `yyyy-MM-ddTHH:mm` giờ Việt Nam) thành "dd/mm/yyyy HH:mm"; mốc lỗi hiện "—". */
export function stampText(value: string): string {
  const local = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (local && !/(Z|[+-]\d{2}:?\d{2})$/.test(value)) return `${local[3]}/${local[2]}/${local[1]} ${local[4]}:${local[5]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const part = (type: string) => clock.formatToParts(date).find((item) => item.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}`;
}
