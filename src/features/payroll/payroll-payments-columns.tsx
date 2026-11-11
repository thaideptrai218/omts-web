import { StatusPill } from "@/components/ui/management-page";
import { Money } from "@/features/operations/ui";
import type { PaymentRow } from "./contracts";
import type { DataColumn } from "./payroll-data-table";
import { formatDateTime, kindLabel, methodLabel, paymentStatusLabel } from "./payroll-model";
import s from "./payroll-screen.module.css";

/** Columns of the standalone "Thanh toán lương" list (KiotViet voucher list). `amount` is the one summed in the totals row. */
export const paymentListColumns: readonly DataColumn<PaymentRow>[] = [
  { key: "code", label: "Mã phiếu chi", render: (row) => <span className={s.mono}>{row.voucherCode}</span> },
  { key: "time", label: "Thời gian", render: (row) => formatDateTime(row.paidAt) },
  { key: "employee", label: "Nhân viên", render: (row) => <span className={s.name}>{row.employeeName}</span> },
  { key: "sheet", label: "Bảng lương", render: (row) => row.payrollCode ?? "—" },
  { key: "kind", label: "Loại", render: (row) => kindLabel[row.kind] },
  { key: "method", label: "Phương thức", render: (row) => methodLabel[row.method] },
  { key: "amount", label: "Số tiền", right: true, render: (row) => <Money value={row.amount} /> },
  { key: "status", label: "Trạng thái", render: (row) => <StatusPill tone={row.status === "Cancelled" ? "danger" : "success"}>{paymentStatusLabel[row.status]}</StatusPill> },
];
