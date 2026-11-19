"use client";
import Link from "next/link";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { isStockKind, receiptHref, returnHref } from "@/features/input-items/stock-kind";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { vnd } from "./report-format";
import { ReportCard, ReportTable, type ReportColumn } from "./report-parts";
import type { PurchaseLines } from "./supplier-report-contracts";

type Document = PurchaseLines["documents"][number];

const columns: ReportColumn<Document>[] = [
  {
    key: "code", header: "Mã phiếu",
    cell: (row) => {
      const kind = isStockKind(row.receiptKind) ? row.receiptKind : null;
      return <Link href={row.isReturn ? returnHref(row.code, kind) : receiptHref(row.code, kind)} className="font-semibold text-primary underline">{row.code}</Link>;
    },
  },
  { key: "type", header: "Loại", cell: (row) => row.isReturn ? "Trả hàng nhập" : "Nhập hàng" },
  { key: "date", header: "Ngày", cell: (row) => formatVietnameseDate(row.date) },
  { key: "supplier", header: "Nhà cung cấp", cell: (row) => row.supplier.name },
  { key: "value", header: "Giá trị", numeric: true, cell: (row) => row.isReturn ? vnd(-row.value) : vnd(row.value) },
];

type Props = Readonly<{ label: string; data?: PurchaseLines | null; loading: boolean; error?: string; onRetry(): void }>;

/** Phiếu nhập và phiếu trả của nhóm đang mở (bấm tên nhóm ở bảng); mã phiếu dẫn sang phiếu đó. Phiếu trả hiện số âm vì làm giảm giá trị nhập. */
export function PurchaseDocumentsCard({ label, data, loading, error, onRetry }: Props) {
  return (
    <ReportCard title={`Phiếu nhập của ${label}`}>
      {loading && <p role="status" className="text-sm text-text-muted">Đang tải phiếu...</p>}
      {error && <ListStateMessage error={error} onRetry={onRetry} />}
      {data && !data.documents.length && <ListStateMessage>{data.message ?? "Nhóm này chưa có phiếu nào trong kỳ."}</ListStateMessage>}
      {data && data.documents.length > 0 && <ReportTable caption={`Phiếu nhập của ${label}`} columns={columns} rows={data.documents} rowKey={(row) => `${row.isReturn ? "TH" : "PN"}:${row.id}`} />}
    </ReportCard>
  );
}
