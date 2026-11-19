import { invoiceHref } from "@/features/customers/customer-links";
import { orderHref } from "@/features/sales-orders/order-labels";
import { salesReturnHref } from "@/features/sales-returns/return-labels";
import { formatVnd } from "@/shared/format/vnd";
import type { EndOfDayReport, SalesGroup } from "../end-of-day-contracts";
import { cell, stampText, type EodColumn, type EodDocument, type EodRow } from "../end-of-day-model";
import { count, plainKg, vnd } from "../report-format";

export const GROUP_LABEL: Record<SalesGroup["kind"], string> = { Order: "Đặt hàng", Invoice: "Hóa đơn", Return: "Trả hàng" };
const HREF: Record<SalesGroup["kind"], (code: string) => string> = { Order: orderHref, Invoice: invoiceHref, Return: salesReturnHref };
const KINDS: SalesGroup["kind"][] = ["Order", "Invoice", "Return"];
const money = (value: number) => formatVnd(value);
const bold = (text: string) => cell(text, { strong: true });

const COLUMNS: readonly EodColumn[] = [
  { key: "code", header: "Chứng từ", width: 1.3 }, { key: "at", header: "Thời gian", width: 1.35 }, { key: "customer", header: "Khách hàng", width: 1.8 },
  { key: "zone", header: "Vùng nuôi", width: 1.1 }, { key: "kg", header: "SL (kg)", numeric: true, width: 0.85 }, { key: "revenue", header: "Doanh thu", numeric: true, width: 1.15 },
  { key: "discount", header: "Giảm giá", numeric: true, width: 1 }, { key: "other", header: "Thu khác", numeric: true, width: 0.95 },
  { key: "paid", header: "Thực thu", numeric: true, width: 1.15 }, { key: "debt", header: "Công nợ", numeric: true, width: 1.1 },
];

/** Bán hàng: ba nhóm Đặt hàng / Hóa đơn / Trả hàng (mỗi nhóm một dòng tổng bấm ⊞/⊟ được) và dòng tổng; đặt hàng không cộng vào doanh thu tổng. */
export function buildSales(sales: NonNullable<EndOfDayReport["sales"]>): EodDocument {
  const groups = KINDS.map((kind) => sales.groups.find((group) => group.kind === kind)).filter((group): group is SalesGroup => !!group);
  const rows: EodRow[] = groups.flatMap((group) => {
    const key = `sales:${group.kind}`;
    const head: EodRow = {
      key, role: "group", toggle: group.rows.length ? { defaultOpen: true } : undefined,
      cells: [bold(`${GROUP_LABEL[group.kind]} (${count(group.count)})`), cell(""), cell(""), cell(""), bold(plainKg(group.quantityKg)), bold(money(group.revenue)),
        bold(money(group.discount)), bold(money(group.otherCharges)), bold(money(group.paid)), bold(money(group.debt))],
    };
    const items = group.rows.map((row): EodRow => ({
      key: `${key}:${row.id}`, role: "item", parent: key,
      cells: [cell(row.code, { href: HREF[group.kind](row.code) }), cell(stampText(row.at)), cell(row.customer?.name ?? "Khách lẻ"), cell(row.zoneName ?? "—"), cell(plainKg(row.quantityKg)), cell(money(row.revenue)),
        cell(money(row.discount)), cell(money(row.otherCharges)), cell(money(row.paid)), cell(money(row.debt))],
    }));
    return [head, ...items];
  });
  const { totals } = sales, orders = groups.find((group) => group.kind === "Order"), invoices = groups.find((group) => group.kind === "Invoice");
  return {
    tiles: [
      { label: "Hóa đơn", value: count(invoices?.count ?? 0) }, { label: "Doanh thu", value: vnd(totals.revenue) }, { label: "Doanh thu thuần", value: vnd(totals.netRevenue) }, { label: "Giảm giá", value: vnd(totals.discount) },
      { label: "Thực thu", value: vnd(totals.paid) }, { label: "Công nợ", value: vnd(totals.debt) },
      { label: "Đặt hàng", value: count(orders?.count ?? 0), hint: `Tiền cọc nhận ${vnd(orders?.paid ?? 0)}` },
    ],
    tables: [{
      id: "sales", title: "Bán hàng", columns: COLUMNS, rows, emptyText: "Không có chứng từ bán hàng nào trong khoảng thời gian đã chọn.",
      total: [bold("Tổng cộng"), cell(""), cell(""), cell(""), bold(plainKg(totals.quantityKg)), bold(money(totals.revenue)),
        bold(money(totals.discount)), bold(money(totals.otherCharges)), bold(money(totals.paid)), bold(money(totals.debt))],
    }],
    note: "Đặt hàng là đơn tạo trong kỳ; Thực thu của đặt hàng là tiền cọc nhận trong kỳ và không cộng vào doanh thu tổng.",
  };
}
