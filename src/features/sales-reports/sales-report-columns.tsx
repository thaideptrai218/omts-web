import type { ReactNode } from "react";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { SalesGroup, SalesGroupBy, SalesReport } from "./contracts";
import { count, kg, vnd } from "./report-format";
import { RowLinkButton, type ReportColumn } from "./report-parts";

export const GROUP_LABEL: Record<SalesGroupBy, string> = { customer: "Khách hàng", product: "Sản phẩm", zone: "Vùng nuôi", day: "Ngày", week: "Tuần", month: "Tháng" };
export const isTimeGroup = (groupBy: SalesGroupBy) => groupBy === "day" || groupBy === "week" || groupBy === "month";

/** Tên nhóm hiển thị: backend trả nhóm thời gian dạng 2026-11-18 / 2026-W47 / 2026-11; đổi sang kiểu Việt Nam (18/11/2026, Tuần 47/2026, 11/2026). */
export function groupLabel(group: SalesGroup, groupBy: SalesGroupBy): string {
  if (groupBy === "day" && /^\d{4}-\d{2}-\d{2}$/.test(group.key)) return formatVietnameseDate(group.key);
  const week = groupBy === "week" ? /^(\d{4})-W(\d{2})$/.exec(group.label) : null;
  if (week) return `Tuần ${week[2]}/${week[1]}`;
  const month = groupBy === "month" ? /^(\d{4})-(\d{2})$/.exec(group.label) : null;
  return month ? `${month[2]}/${month[1]}` : group.label;
}

/** Thứ tự nhóm để vẽ và hiển thị: thời gian theo ngày tăng dần, các cách gộp khác theo doanh thu thuần giảm dần. */
export function orderGroups(groups: readonly SalesGroup[], groupBy: SalesGroupBy): SalesGroup[] {
  return [...groups].sort(isTimeGroup(groupBy) ? (a, b) => a.key.localeCompare(b.key) : (a, b) => b.netRevenue - a.netRevenue);
}

type Options = Readonly<{
  groupBy: SalesGroupBy; totals: SalesReport["totals"];
  /** Bấm tên nhóm mở danh sách hóa đơn của nhóm; không truyền thì tên chỉ là chữ. */
  onOpen?(group: SalesGroup): void; openKey?: string;
  /** Thêm cột "Đã thu ròng" và "Còn nợ" (chỉ có nghĩa khi gộp theo khách hàng). */
  withDebt?: boolean;
  /** Tên cột đầu; mặc định theo cách gộp. */
  firstHeader?: string;
}>;

/** Cột bảng theo nhóm của báo cáo bán hàng: số hóa đơn, kg, doanh thu, giảm giá, hàng trả, doanh thu thuần (+ thu/nợ khi gộp theo khách), kèm dòng tổng. */
export function salesGroupColumns({ groupBy, totals, onOpen, openKey, withDebt, firstHeader }: Options): ReportColumn<SalesGroup>[] {
  const name = (group: SalesGroup): ReactNode => onOpen
    ? <RowLinkButton pressed={openKey === group.key} onClick={() => onOpen(group)}>{groupLabel(group, groupBy)}</RowLinkButton> : groupLabel(group, groupBy);
  const columns: ReportColumn<SalesGroup>[] = [
    { key: "label", header: firstHeader ?? GROUP_LABEL[groupBy], cell: name, total: "Tổng" },
    { key: "invoices", header: "Số hóa đơn", numeric: true, cell: (group) => count(group.invoiceCount), total: count(totals.invoiceCount) },
    { key: "soldKg", header: "Kg đã bán", numeric: true, cell: (group) => kg(group.soldKg), total: kg(totals.soldKg) },
    { key: "revenue", header: "Doanh thu", numeric: true, cell: (group) => vnd(group.revenue), total: vnd(totals.revenue) },
    { key: "cuts", header: "Giảm giá sau bán", numeric: true, cell: (group) => vnd(group.priceCuts), total: vnd(totals.priceCuts) },
    { key: "returns", header: "Hàng trả", numeric: true, cell: (group) => vnd(group.salesReturns), total: vnd(totals.salesReturns) },
    { key: "net", header: "Doanh thu thuần", numeric: true, cell: (group) => vnd(group.netRevenue), total: vnd(totals.netRevenue) },
  ];
  if (withDebt) columns.push(
    { key: "received", header: "Đã thu ròng", numeric: true, cell: (group) => vnd(group.netMoneyReceived), total: vnd(totals.netMoneyReceived) },
    { key: "debt", header: "Còn nợ", numeric: true, cell: (group) => vnd(group.receivable), total: vnd(totals.receivable) },
  );
  return columns;
}
