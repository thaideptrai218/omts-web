"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { ListStateMessage, managementStyles } from "@/components/ui/management-screen/management-table";
import { PersonPicker } from "@/components/ui/management-screen/person-picker";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { fmt, nowLocal, viDateTime, vnLocal } from "@/features/purchase-documents/document-parts";
import { Field, MethodChoice } from "@/features/purchase-documents/payment-dialogs";
import styles from "@/features/purchase-documents/purchases.module.css";
import { AccountPicker } from "@/features/cash-book/cash-pickers";
import type { PaymentDetail, PaymentMethod, PaymentRow } from "./contracts";
import { accountField, paidAtInstant } from "./payroll-payment-fields";
import { kindLabel, paymentStatusLabel, sheetHref } from "./payroll-model";
import { SlipStatusPills } from "./payroll-slip-status";
import { payrollRepository } from "./repository";
import { useBankAccounts } from "./use-bank-accounts";
import { usePayrollWriter } from "./use-payroll-writer";


/**
 * "Phiếu chi" of wages, on the layout of the supplier voucher (PaymentVoucherDialog): the time, who handed the money over, the method and the note can be corrected and the voucher
 * can be cancelled (the payslip is owed again); the amount and the payslip never change. `onClose(true)` tells the screen behind to read again.
 */
export function WageVoucherDialog({ voucher, onClose }: { voucher: Pick<PaymentRow, "id">; onClose(changed?: boolean): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => payrollRepository.paymentDetail(voucher.id, signal), [voucher.id]));
  const close = (open: boolean) => { if (!open) onClose(); };
  if (remote.loading) return <Dialog open size="xl" title="Phiếu chi" onOpenChange={close}><Skeleton /></Dialog>;
  if (remote.error || !remote.data) return <Dialog open size="xl" title="Phiếu chi" onOpenChange={close}><ListStateMessage error={remote.error ?? "Không tải được phiếu chi."} onRetry={remote.reload} /></Dialog>;
  return <Voucher key={remote.data.rowVersion} payment={remote.data} onClose={onClose} />;
}

function Voucher({ payment, onClose }: { payment: PaymentDetail; onClose(changed?: boolean): void }) {
  const writer = usePayrollWriter(), bank = useBankAccounts(true), confirmation = useActionDialog(), { notify } = useToast(), save = useMutation();
  const payers = useRemote(useCallback((signal: AbortSignal) => payrollRepository.payers(signal), []));
  const cancelled = payment.status === "Cancelled", locked = cancelled || !writer;
  const initial = { paidAt: vnLocal(payment.paidAt), paidById: payment.paidById ?? "", method: payment.method as PaymentMethod, cashAccountId: payment.cashAccountId ?? "", note: payment.note ?? "" };
  const [values, setValues] = useState(initial);
  const set = <K extends keyof typeof initial>(key: K, value: (typeof initial)[K]) => setValues((current) => ({ ...current, [key]: value }));
  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((key) => values[key] !== initial[key]);
  const listed = payers.data ?? [];
  const people = payment.paidById && payment.paidBy && !listed.some((row) => row.id === payment.paidById) ? [{ id: payment.paidById, name: payment.paidBy }, ...listed] : listed;
  // A bank account the voucher already names stays choosable even when it is no longer active.
  const accountChoices = payment.cashAccountId && !bank.some((row) => row.id === payment.cashAccountId)
    ? [...bank, { id: payment.cashAccountId, kind: "Bank" as const, bankBin: undefined, providerName: payment.cashAccountName ?? "", accountNumber: "", holderName: "", note: undefined, isActive: false, isVietQr: false, rowVersion: "" }] : bank;
  const account = values.cashAccountId || bank[0]?.id || "";
  const slipAt = (row: PaymentDetail["allocations"][number]) => row.finalizedAt ? viDateTime(row.finalizedAt) : "—";
  const allocated = payment.allocations.reduce((sum, row) => sum + row.amount, 0);

  async function update() {
    if (values.method === "BankTransfer" && !account) { notify({ tone: "danger", title: "Chọn tài khoản chi." }); return; }
    const done = await save.run(() => payrollRepository.updatePayment(payment.id, {
      rowVersion: payment.rowVersion, method: values.method, note: values.note.trim(), ...(values.paidById ? { paidById: values.paidById } : {}),
      ...(values.paidAt !== initial.paidAt ? { paidAt: paidAtInstant(values.paidAt) } : {}),
      ...accountField({ paidAt: values.paidAt, method: values.method, note: values.note, cashAccountId: account }),
    }));
    if (!done) return;
    notify({ tone: "success", title: `Đã cập nhật phiếu chi ${payment.code}.` });
    onClose(true);
  }
  async function cancel() {
    if (!await confirmation.confirm(`Hủy phiếu chi ${payment.code}? ${payment.kind === "Advance" ? "Khoản tạm ứng sẽ không còn được ghi nhận." : "Phiếu lương sẽ cần trả lại số tiền này."} Phiếu chi cũng bị hủy trong Sổ quỹ.`)) return;
    const done = await save.run(() => payrollRepository.cancelPayment(payment.id, { rowVersion: payment.rowVersion }));
    if (!done) return;
    notify({ tone: "success", title: `Đã hủy phiếu chi ${payment.code}.` });
    onClose(true);
  }

  return <Dialog open size="xl" dismissible={!save.pending} title="Phiếu chi" onOpenChange={(open) => { if (!open) onClose(); }}><div className={`${managementStyles.theme} ${styles.voucher}`}>{confirmation.dialog}
    <p className={styles.voucherSub}><a className={styles.link} href={`/workspace/employees?recordId=${payment.employeeId}&search=${encodeURIComponent(payment.employeeName)}`}>{payment.employeeName}</a>
      <StatusPill tone={cancelled ? "danger" : "success"}>{paymentStatusLabel[payment.status]}</StatusPill><span className={styles.debtChip}>{kindLabel[payment.kind]}</span></p>
    <div className={styles.voucherGrid}>
      <Field label="Mã phiếu chi"><input className={styles.voucherInput} readOnly value={payment.code} /></Field>
      <Field label="Tài khoản tạo"><input className={styles.voucherInput} readOnly value={payment.createdBy ?? "—"} /></Field>
      <Field label="Thời gian"><DatePickerField label="Thời gian chi" withTime disabled={locked} value={values.paidAt} max={nowLocal()} onChange={(value) => set("paidAt", value)} /></Field>
      <Field label="Nhân viên"><input className={styles.voucherInput} readOnly value={payment.employeeCode ? `${payment.employeeName} (${payment.employeeCode})` : payment.employeeName} /></Field>
      <Field label="Nhân viên tạo"><PersonPicker label="Nhân viên tạo" disabled={locked} people={people} value={values.paidById} placeholder="Người đang đăng nhập" onChange={(value) => set("paidById", value)} /></Field>
      <Field label="Phương thức thanh toán">{locked
        ? <input className={styles.voucherInput} readOnly value={values.method === "BankTransfer" ? "Chuyển khoản" : "Tiền mặt"} />
        : <MethodChoice value={values.method} onChange={(method) => setValues((current) => ({ ...current, method, cashAccountId: "" }))} />}</Field>
      {values.method === "BankTransfer" && <Field label="Tài khoản chi" wide><AccountPicker label="Tài khoản chi" disabled={locked} accounts={accountChoices} value={account} onChange={(value) => set("cashAccountId", value)} /></Field>}
      <Field label="Ghi chú" wide><textarea className={styles.voucherNote} readOnly={locked} placeholder="Nhập ghi chú" maxLength={500} value={values.note} onChange={(event) => set("note", event.target.value)} /></Field>
      {payment.cancelReason && <Field label="Lý do hủy" wide><p className={styles.danger}>{payment.cancelReason}</p></Field>}
    </div>
    <div className={styles.innerScroll}><table className={styles.inner}><thead><tr><th>Mã phiếu</th><th>Thời gian</th><th className={styles.num}>Giá trị phiếu</th><th className={styles.num}>Đã chi trước</th><th className={styles.num}>Tiền chi</th><th>Trạng thái</th></tr></thead>
      <tbody>
        <tr className={styles.totalRow}><td colSpan={4} /><td className={styles.num}>{fmt(payment.kind === "Advance" ? payment.advanceAmount : allocated)}</td><td /></tr>
        {payment.allocations.map((row) => <tr key={row.slipId}>
          <td><a className={styles.link} href={sheetHref(row.payrollId, row.payrollCode)}>{row.slipCode}</a></td><td>{slipAt(row)}</td>
          <td className={styles.num}>{fmt(row.slipNet)}</td><td className={styles.num}>{fmt(row.paidBefore)}</td><td className={styles.num}>{fmt(row.amount)}</td>
          <td><SlipStatusPills status="Finalized" net={row.slipNet} paid={row.paidBefore + row.amount} state={row.slipStatus} /></td></tr>)}
        {payment.kind === "Advance" && <tr>
          <td>Tạm ứng</td><td>{viDateTime(payment.paidAt)}</td><td className={styles.num}>{fmt(payment.advanceAmount)}</td><td className={styles.num}>{fmt(0)}</td><td className={styles.num}>{fmt(payment.advanceAmount)}</td>
          <td><StatusPill tone={payment.advanceDeducted >= payment.advanceAmount ? "success" : "neutral"}>{payment.advanceDeducted > 0 ? `Đã trừ ${fmt(payment.advanceDeducted)} vào bảng lương` : "Chưa trừ vào bảng lương"}</StatusPill></td></tr>}
      </tbody></table></div>
    <Field label="Tổng tiền chi" wide><input className={`${styles.voucherInput} ${styles.voucherMoney} ${styles.voucherTotal}`} readOnly value={fmt(payment.total)} /></Field>
    <ErrorNotice error={save.error} />
    <footer className={`${styles.dialogFoot} ${styles.voucherFoot}`}>
      <div>{!locked && <Button className="w-auto" variant="ghost" disabled={save.pending} onClick={() => void cancel()}><InterfaceIcon name="trash" className="size-4" />Hủy bỏ</Button>}
        <a className={styles.link} href={`/operations/cash-book?search=${encodeURIComponent(payment.code)}`}>Mở trong Sổ quỹ</a></div>
      <div><Button className="w-auto" variant="secondary" disabled={save.pending} onClick={() => onClose()}>Bỏ qua</Button>{!locked && <Button className="w-auto" isPending={save.pending} disabled={!dirty} onClick={() => void update()}>Cập nhật</Button>}</div>
    </footer>
  </div></Dialog>;
}
