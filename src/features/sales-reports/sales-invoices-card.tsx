"use client";
import Link from "next/link";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { invoiceHref } from "@/features/customers/customer-links";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { SalesInvoiceList } from "./contracts";
import { vnd } from "./report-format";
import { ReportCard, ReportTable, type ReportColumn } from "./report-parts";

const columns: ReportColumn<SalesInvoiceList["invoices"][number]>[] = [
  { key: "code", header: "Mã hóa đơn", cell: (row) => <Link href={invoiceHref(row.code)} className="font-semibold text-primary underline">{row.code}</Link> },
  { key: "date", header: "Ngày", cell: (row) => formatVietnameseDate(row.date) },
  { key: "customer", header: "Khách hàng", cell: (row) => row.customer?.name ?? "Khách lẻ" },
  { key: "zone", header: "Vùng nuôi", cell: (row) => row.zone.name },
  { key: "total", header: "Tổng tiền", numeric: true, cell: (row) => vnd(row.total) },
  { key: "return", header: "Hàng trả", numeric: true, cell: (row) => vnd(row.returnValue) },
  { key: "net", header: "Thành tiền ròng", numeric: true, cell: (row) => vnd(row.net) },
];

type Props = Readonly<{ label: string; data?: SalesInvoiceList | null; loading: boolean; error?: string; onRetry(): void }>;

/** Hóa đơn của nhóm đang mở (bấm tên nhóm ở bảng); mã hóa đơn dẫn sang chi tiết hóa đơn. */
export function SalesInvoicesCard({ label, data, loading, error, onRetry }: Props) {
  return (
    <ReportCard title={`Hóa đơn của ${label}`}>
      {loading && <p role="status" className="text-sm text-text-muted">Đang tải hóa đơn...</p>}
      {error && <ListStateMessage error={error} onRetry={onRetry} />}
      {data && !data.invoices.length && <ListStateMessage>{data.message ?? "Nhóm này chưa có hóa đơn trong kỳ."}</ListStateMessage>}
      {data && data.invoices.length > 0 && <ReportTable caption={`Hóa đơn của ${label}`} columns={columns} rows={data.invoices} rowKey={(row) => row.id} />}
    </ReportCard>
  );
}
