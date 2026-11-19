import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { formatVnd } from "@/shared/format/vnd";
import type { EndOfDayReport, FundRow } from "../end-of-day-contracts";
import { FUND_LABEL, PARTY_KIND_LABEL, SOURCE_LABEL } from "../end-of-day-filters-model";
import { cell, stampText, type EodColumn, type EodDocument, type EodRow, type EodTable } from "../end-of-day-model";
import { vnd } from "../report-format";

const money = (value: number) => formatVnd(value);
const bold = (text: string) => cell(text, { strong: true });
type Money = NonNullable<EndOfDayReport["money"]>;

const FUND_COLUMNS: readonly EodColumn[] = [
  { key: "fund", header: "Quỹ", width: 2 }, { key: "receipts", header: "Thu", numeric: true, width: 1.5 }, { key: "payments", header: "Chi", numeric: true, width: 1.5 }, { key: "net", header: "Chênh lệch", numeric: true, width: 1.5 },
];
const ENTRY_COLUMNS: readonly EodColumn[] = [
  { key: "code", header: "Mã phiếu", width: 1.55 }, { key: "at", header: "Thời gian", width: 1.3 }, { key: "source", header: "Nguồn", width: 1.2 }, { key: "fund", header: "Quỹ", width: 1 },
  { key: "type", header: "Loại thu chi", width: 1.3 }, { key: "party", header: "Đối tượng", width: 1.4 }, { key: "receipt", header: "Thu", numeric: true, width: 1.25 }, { key: "payment", header: "Chi", numeric: true, width: 1.25 },
  { key: "note", header: "Ghi chú", width: 1.4 }, { key: "by", header: "Người tạo", width: 1.2 },
];

/** Bảng "Thu chi theo quỹ" (dùng cho cả Thu chi và Tổng hợp). */
export function fundTable(byFund: readonly FundRow[], totals: Money["totals"]): EodTable {
  return {
    id: "money-funds", title: "Thu chi theo quỹ", columns: FUND_COLUMNS, emptyText: "Không có khoản thu chi nào trong khoảng thời gian đã chọn.",
    rows: byFund.map((row): EodRow => ({ key: `fund:${row.fund}`, role: "item", cells: [cell(FUND_LABEL[row.fund] ?? row.fund), cell(money(row.receipts)), cell(money(row.payments)), cell(money(row.net))] })),
    total: [bold("Tổng cộng"), bold(money(totals.receipts)), bold(money(totals.payments)), bold(money(totals.net))],
  };
}

/** Thu chi: bảng theo quỹ và chi tiết từng dòng sổ quỹ (mã phiếu là link sang Sổ quỹ). */
export function buildMoney(data: Money): EodDocument {
  const entries = data.entries.map((entry, index): EodRow => {
    const party = [entry.partyKind ? PARTY_KIND_LABEL[entry.partyKind] ?? entry.partyKind : "", entry.partyName ?? ""].filter(Boolean).join(": ");
    return {
      key: `entry:${index}:${entry.code ?? ""}`, role: "item",
      cells: [entry.code ? cell(entry.code, { href: farmingReferenceHref("cashBook", { search: entry.code }) }) : cell("—"), cell(stampText(entry.at)), cell(SOURCE_LABEL[entry.source] ?? "Thu chi khác"), cell(FUND_LABEL[entry.fund] ?? entry.fund),
        cell(entry.typeName ?? "—"), cell(party || "—"), cell(entry.direction === "Receipt" ? money(entry.amount) : ""), cell(entry.direction === "Payment" ? money(entry.amount) : ""), cell(entry.note ?? ""), cell(entry.createdByName ?? "—")],
    };
  });
  const detail: EodTable = {
    id: "money-entries", title: "Chi tiết thu chi", columns: ENTRY_COLUMNS, rows: entries, emptyText: "Không có dòng sổ quỹ nào trong khoảng thời gian đã chọn.",
    total: [bold("Tổng cộng"), ...Array.from({ length: 5 }, () => cell("")), bold(money(data.totals.receipts)), bold(money(data.totals.payments)), cell(""), cell("")],
  };
  return {
    tiles: [{ label: "Tổng thu", value: vnd(data.totals.receipts) }, { label: "Tổng chi", value: vnd(data.totals.payments) }, { label: "Chênh lệch", value: vnd(data.totals.net) }],
    tables: [fundTable(data.byFund, data.totals), detail],
    note: "Tiền mặt đang chờ Kế toán xác nhận chưa vào sổ quỹ nhưng đã nằm trong số thực thu của hóa đơn.",
  };
}
