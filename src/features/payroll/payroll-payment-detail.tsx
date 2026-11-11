"use client";
import { StatusPill } from "@/components/ui/management-page";
import { Money } from "@/features/operations/ui";
import type { PaymentRow } from "./contracts";
import { sheetHref } from "./employee-payslips-tab";
import { formatDateTime, kindLabel, methodLabel, paymentStatusLabel } from "./payroll-model";
import s from "./payroll-screen.module.css";

/** The open voucher of "Thanh toán lương": its fields and what it belongs to (the sheet, or a plain advance), with links to the sheet and the employee. */
export function PayrollPaymentDetail({ row }: { row: PaymentRow }) {
  return <section className={s.detail} aria-label={`Chi tiết phiếu chi ${row.voucherCode}`}>
    <dl className={`${s.facts} mt-3`}>
      <div><dt>Mã phiếu chi</dt><dd>{row.voucherCode}</dd></div>
      <div><dt>Thời gian</dt><dd>{formatDateTime(row.paidAt)}</dd></div>
      <div><dt>Nhân viên</dt><dd><a className={s.link} href={`/workspace/employees?recordId=${row.employeeId}&search=${encodeURIComponent(row.employeeName)}`}>{row.employeeName}</a></dd></div>
      <div><dt>Loại</dt><dd>{kindLabel[row.kind]}</dd></div>
      <div><dt>Phương thức</dt><dd>{methodLabel[row.method]}</dd></div>
      <div><dt>Số tiền</dt><dd><Money value={row.amount} /></dd></div>
      <div><dt>Trạng thái</dt><dd><StatusPill tone={row.status === "Cancelled" ? "danger" : "success"}>{paymentStatusLabel[row.status]}</StatusPill></dd></div>
      <div><dt>Thuộc bảng lương</dt><dd>{row.payrollId && row.payrollCode ? <a className={s.link} href={sheetHref(row.payrollId, row.payrollCode)}>{row.payrollCode}</a>
        : "Tạm ứng ngoài bảng lương, trừ vào kỳ lương kế tiếp khi chốt lương"}</dd></div>
    </dl>
    <p className={`${s.muted} mt-3`}>Phiếu chi này nằm trong Sổ quỹ.</p>
  </section>;
}
