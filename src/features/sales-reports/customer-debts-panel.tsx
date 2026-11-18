"use client";
import Link from "next/link";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { invoiceHref } from "@/features/customers/customer-links";
import { Paging } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { count, vnd } from "./report-format";
import s from "./report-live.module.css";
import { ReportCard, ReportTable, ReportTiles, RowLinkButton, type ReportColumn } from "./report-parts";
import { DEBT_PAGE_SIZE, type DebtList, type DebtStatement } from "./use-customer-debts";

type DebtRow = DebtList["page"]["items"][number];
type Entry = DebtStatement["entries"][number];

const KIND_LABEL: Record<Entry["kind"], string> = { Invoice: "Hóa đơn", Return: "Trả hàng", Payment: "Thanh toán", PaidBack: "Hoàn tiền cho khách" };

const entryColumns: ReportColumn<Entry>[] = [
  { key: "date", header: "Ngày", cell: (row) => formatVietnameseDate(row.date) },
  { key: "kind", header: "Loại", cell: (row) => KIND_LABEL[row.kind] },
  { key: "code", header: "Mã", cell: (row) => row.code },
  // Dòng hóa đơn tự là hóa đơn; thanh toán/trả hàng nêu hóa đơn liên quan.
  { key: "invoice", header: "Hóa đơn", cell: (row) => { const code = row.kind === "Invoice" ? row.code : row.invoiceCode; return code ? <Link href={invoiceHref(code)} className="font-semibold text-primary underline">{code}</Link> : "—"; } },
  { key: "note", header: "Ghi chú", cell: (row) => [row.cancelled ? "Đã hủy" : "", row.awaitingConfirmation ? "Chờ xác nhận" : ""].filter(Boolean).join(", ") || "—" },
  { key: "change", header: "Thay đổi công nợ", numeric: true, cell: (row) => vnd(row.debtChange) },
  { key: "after", header: "Công nợ sau", numeric: true, cell: (row) => vnd(row.debtAfter) },
];

/** Sổ công nợ của một khách trong kỳ: nợ đầu kỳ, từng phát sinh kèm công nợ sau, nợ cuối kỳ và hóa đơn chưa trả. */
function StatementCard({ statement, loading, error, onRetry }: Readonly<{ statement?: DebtStatement | null; loading: boolean; error?: string; onRetry(): void }>) {
  if (loading) return <p role="status" className="text-sm text-text-muted">Đang tải sổ công nợ...</p>;
  if (error) return <ListStateMessage error={error} onRetry={onRetry} />;
  if (!statement) return null;
  return (
    <ReportCard title={`Sổ công nợ của ${statement.customer.name} (${formatVietnameseDate(statement.from)} – ${formatVietnameseDate(statement.to)})`}>
      <ReportTiles label="Công nợ trong kỳ" tiles={[
        { label: "Nợ đầu kỳ", value: vnd(statement.openingDebt) }, { label: "Nợ cuối kỳ", value: vnd(statement.closingDebt) },
        { label: "Nợ hôm nay", value: vnd(statement.debtToday), hint: statement.debtAgeDays == null ? undefined : `${count(statement.debtAgeDays)} ngày` },
      ]} />
      {statement.entries.length
        ? <ReportTable caption="Phát sinh công nợ trong kỳ" columns={entryColumns} rows={statement.entries} rowKey={(row) => `${row.kind}-${row.id}`} />
        : <ListStateMessage>Không có phát sinh công nợ trong kỳ này.</ListStateMessage>}
      {statement.unpaidInvoices.length > 0 && <ReportTable caption="Hóa đơn chưa trả đủ" columns={[
        { key: "code", header: "Hóa đơn chưa trả đủ", cell: (row) => <Link href={invoiceHref(row.code)} className="font-semibold text-primary underline">{row.code}</Link> },
        { key: "date", header: "Ngày", cell: (row) => formatVietnameseDate(row.invoiceDate) },
        { key: "total", header: "Tổng tiền", numeric: true, cell: (row) => vnd(row.total) },
        { key: "unpaid", header: "Còn nợ", numeric: true, cell: (row) => vnd(row.unpaid) },
        { key: "age", header: "Số ngày nợ", numeric: true, cell: (row) => count(row.ageDays) },
      ]} rows={statement.unpaidInvoices} rowKey={(row) => row.id} />}
    </ReportCard>
  );
}

type Props = Readonly<{
  list: DebtList; page: number; onPage(page: number): void; busy: boolean;
  openId?: string; onOpen(id: string | undefined): void;
  statement: Readonly<{ data?: DebtStatement | null; loading: boolean; error?: string; reload(): void }>;
}>;

/** Công nợ khách hàng: ô tổng, bảng khách đang có công nợ (bấm tên mở sổ chi tiết) và sổ công nợ của khách đang mở. */
export function CustomerDebtsPanel({ list, page, onPage, busy, openId, onOpen, statement }: Props) {
  const columns: ReportColumn<DebtRow>[] = [
    { key: "customer", header: "Khách hàng", cell: (row) => <RowLinkButton pressed={openId === row.customer.id} onClick={() => onOpen(openId === row.customer.id ? undefined : row.customer.id)}>{row.customer.name}</RowLinkButton> },
    { key: "phone", header: "Số điện thoại", cell: (row) => row.customer.phoneNumber ?? "—" },
    { key: "debt", header: "Công nợ hiện tại", numeric: true, cell: (row) => vnd(row.debt) },
    { key: "age", header: "Số ngày nợ", numeric: true, cell: (row) => row.debtAgeDays == null ? "—" : count(row.debtAgeDays) },
    { key: "oldest", header: "Hóa đơn chưa trả cũ nhất", numeric: true, cell: (row) => row.oldestUnpaidDate ? formatVietnameseDate(row.oldestUnpaidDate) : "—" },
  ];
  return (
    <>
      <p className={s.period}>Công nợ tính đến hôm nay, không chia theo vùng. Số dương là khách còn nợ hợp tác xã.</p>
      <ReportTiles label="Tổng công nợ" tiles={[
        { label: "Tổng phải thu", value: vnd(list.receivablesTotal) },
        { label: "Hợp tác xã nợ khách", value: vnd(list.owedBackTotal) },
        { label: "Khách đang có công nợ", value: count(list.page.total) },
        { label: "Thanh toán chờ xác nhận", value: count(list.awaitingConfirmationCount) },
      ]} />
      <ReportCard title="Công nợ theo khách hàng">
        {!list.page.items.length ? <ListStateMessage>{list.message ?? "Không có khách hàng nào đang có công nợ."}</ListStateMessage>
          : <ReportTable caption="Công nợ theo khách hàng" columns={columns} rows={list.page.items} rowKey={(row) => row.customer.id} selectedKey={openId} />}
        {list.page.total > DEBT_PAGE_SIZE && <Paging page={page} total={list.page.total} pageSize={DEBT_PAGE_SIZE} disabled={busy} onChange={onPage} />}
      </ReportCard>
      {openId && <StatementCard statement={statement.data} loading={statement.loading} error={statement.error} onRetry={statement.reload} />}
    </>
  );
}
