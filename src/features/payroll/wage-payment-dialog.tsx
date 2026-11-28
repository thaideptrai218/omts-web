"use client";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { PersonPicker } from "@/components/ui/management-screen/person-picker";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { AccountPicker } from "@/features/cash-book/cash-pickers";
import { ErrorNotice, businessTime, useMutation, useRemote } from "@/features/operations/ui";
import { MoneyInput, fmt } from "@/features/purchase-documents/document-parts";
import { Field, MethodChoice } from "@/features/purchase-documents/payment-dialogs";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import type { PaymentMethod } from "./contracts";
import { accountField, paidAtInstant } from "./payroll-payment-fields";
import { payrollRepository } from "./repository";
import { useBankAccounts } from "./use-bank-accounts";

/** One payslip the voucher can pay: its value, what was paid before and what is still owed. `time` is shown as is (the work period). */
export type WageSlipLine = Readonly<{ id: string; code: string; employeeName?: string; time: string; value: number; paidBefore: number; remaining: number }>;
/** A sheet pays the slips the Owner picks; an employee pays the oldest finalized slips first and anything above them is an advance. */
export type WageTarget = Readonly<{ kind: "sheet"; sheetId: string; label: string }> | Readonly<{ kind: "employee"; employeeId: string; name: string }>;

/** Spreads an amount over unpaid payslips in the given order (oldest first), the way the backend settles an employee's payment. */
function spread(amount: number, slips: readonly WageSlipLine[]) {
  let left = amount;
  return Object.fromEntries(slips.map((slip) => { const take = Math.max(0, Math.min(left, slip.remaining)); left -= take; return [slip.id, take]; }));
}

/**
 * "Thanh toán" of wages, on the same form as the supplier payment (PaymentCreateDialog): header fields, the payslips the money is set against, "Tiền chưa phân bổ".
 * From a sheet the rows are editable and drive "Số tiền"; from an employee the amount drives the rows (oldest payslip first) and what is left over is an advance.
 */
export function WagePaymentCreateDialog({ target, slips, onClose, onPaid }: { target: WageTarget; slips: readonly WageSlipLine[]; onClose(): void; onPaid(): void }) {
  const bank = useBankAccounts(true), confirmation = useActionDialog(), { notify } = useToast(), pay = useMutation();
  const payers = useRemote(useCallback((signal: AbortSignal) => payrollRepository.payers(signal), [])), [paidById, setPaidById] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const rows = useMemo(() => slips.filter((slip) => slip.remaining > 0), [slips]);
  const owed = rows.reduce((sum, row) => sum + row.remaining, 0), editableRows = target.kind === "sheet";
  const [paidAt, setPaidAt] = useState(() => businessTime()), [method, setMethod] = useState<PaymentMethod>("Cash"), [cashAccountId, setCashAccountId] = useState(""), [note, setNote] = useState("");
  const [amount, setAmount] = useState(editableRows ? owed : 0), [applied, setApplied] = useState<Record<string, number>>(() => spread(editableRows ? owed : 0, rows));
  const [error, setError] = useState<string>();
  // Until another is picked, a transfer is recorded against the first bank account, so it lands on a fund by default.
  const account = cashAccountId || bank[0]?.id || "";

  const allocated = rows.reduce((sum, row) => sum + (applied[row.id] ?? 0), 0), unallocated = Math.max(0, amount - allocated);
  const changeAmount = (next: number) => { setAmount(next); setApplied(spread(next, rows)); };
  const changeApplied = (id: string, value: number) => {
    const next = { ...applied, [id]: value };
    setApplied(next);
    setAmount(rows.reduce((sum, row) => sum + (next[row.id] ?? 0), 0));
  };

  async function save() {
    if (amount < 1) { setError("Nhập số tiền chi lớn hơn 0."); return; }
    const over = rows.find((row) => (applied[row.id] ?? 0) > row.remaining);
    if (over) { setError(`Phiếu ${over.code} chỉ còn cần trả ${fmt(over.remaining)} đ.`); return; }
    if (editableRows && unallocated > 0) { setError("Số tiền chi vượt tổng số còn cần trả của các phiếu lương."); return; }
    if (!editableRows && unallocated > 0 && !await confirmation.confirm(`Khoản chi vượt số còn cần trả của các phiếu lương. Ghi phần vượt ${fmt(unallocated)} đ là tạm ứng, trừ vào kỳ lương tiếp theo khi chốt lương?`)) return;
    setError(undefined);
    const common = { paidAt: paidAtInstant(paidAt), method, note: note.trim(), ...(paidById ? { paidById } : {}), ...accountField({ paidAt, method, note, cashAccountId: account }) };
    const done = target.kind === "sheet"
      ? await pay.run(() => payrollRepository.pay(target.sheetId, { ...common, lines: rows.filter((row) => (applied[row.id] ?? 0) > 0).map((row) => ({ slipId: row.id, amount: applied[row.id] })) }, idempotencyKey))
      : await pay.run(() => payrollRepository.payStandalone({ employeeId: target.employeeId, amount, ...common }, idempotencyKey));
    if (!done) return;
    notify({ tone: "success", title: "Đã tạo phiếu chi. Phiếu chi xuất hiện trong Sổ quỹ." });
    onPaid();
  }

  const styles = purchaseStyles;
  return <Dialog open size="xl" dismissible={!pay.pending} title="Thanh toán" onOpenChange={(open) => { if (!open) onClose(); }}><div className={`${managementStyles.theme} ${styles.voucher}`}>{confirmation.dialog}
    <p className={styles.voucherSub}><strong>{target.kind === "sheet" ? target.label : target.name}</strong><span className={styles.debtChip}>Còn cần trả: <strong>{fmt(owed)}</strong></span></p>
    <div className={styles.voucherGrid}>
      <Field label="Mã phiếu chi"><input className={styles.voucherInput} readOnly aria-label="Mã phiếu chi" placeholder="Mã phiếu tự động" value="" /></Field>
      <Field label="Nhân viên tạo"><PersonPicker label="Nhân viên tạo" people={payers.data ?? []} value={paidById} placeholder="Người đang đăng nhập" onChange={setPaidById} /></Field>
      <Field label="Thời gian"><DatePickerField label="Thời gian chi" withTime value={paidAt} onChange={setPaidAt} /></Field>
      <div />
      <Field label="Phương thức thanh toán"><MethodChoice value={method} onChange={(next) => { setMethod(next); setCashAccountId(""); }} /></Field>
      {method === "BankTransfer" ? <Field label="Tài khoản chi"><AccountPicker label="Tài khoản chi" accounts={bank} value={account} onChange={setCashAccountId} /></Field> : <div />}
      <Field label="Số tiền"><MoneyInput label="Số tiền chi" className={`${styles.voucherInput} ${styles.voucherMoney}`} value={amount} onChange={changeAmount} /></Field>
      <Field label="Nợ còn"><input className={`${styles.voucherInput} ${styles.voucherMoney}`} readOnly value={fmt(owed - amount)} /></Field>
      <Field label="Ghi chú" wide><textarea className={styles.voucherNote} placeholder="Nhập ghi chú" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></Field>
    </div>
    <div className={styles.innerScroll}><table className={styles.inner}><thead><tr><th>Mã phiếu</th>{editableRows && <th>Nhân viên</th>}<th>Thời gian</th><th className={styles.num}>Giá trị phiếu</th><th className={styles.num}>Đã chi trước</th><th className={styles.num}>Còn cần trả</th><th className={styles.num}>Tiền chi</th><th className={styles.num}>Còn nợ</th></tr></thead>
      <tbody>
        <tr className={styles.totalRow}><td colSpan={editableRows ? 5 : 4} /><td className={styles.num}>{fmt(owed)}</td><td className={styles.num}>{fmt(allocated)}</td><td className={styles.num}>{fmt(owed - allocated)}</td></tr>
        {rows.map((row) => <tr key={row.id}>
          <td>{row.code}</td>{editableRows && <td>{row.employeeName}</td>}<td>{row.time}</td>
          <td className={styles.num}>{fmt(row.value)}</td><td className={styles.num}>{fmt(row.paidBefore)}</td><td className={styles.num}>{fmt(row.remaining)}</td>
          <td className={styles.num}>{editableRows
            ? <MoneyInput label={`Tiền chi phiếu ${row.code}`} className={styles.cellInput} invalid={(applied[row.id] ?? 0) > row.remaining} value={applied[row.id] ?? 0} onChange={(value) => changeApplied(row.id, value)} />
            : fmt(applied[row.id] ?? 0)}</td>
          <td className={styles.num}>{fmt(row.remaining - (applied[row.id] ?? 0))}</td></tr>)}
        {!rows.length && <tr><td colSpan={editableRows ? 8 : 7} className={styles.empty}>{target.kind === "employee" ? "Nhân viên không còn phiếu lương nào cần trả; khoản chi sẽ là tạm ứng, trừ vào kỳ lương tiếp theo." : "Không còn phiếu lương nào cần trả."}</td></tr>}
      </tbody></table></div>
    <p className={styles.unallocated}>{target.kind === "employee" ? "Tạm ứng (chưa phân bổ)" : "Tiền chưa phân bổ"}: <strong>{fmt(unallocated)}</strong></p>
    <ErrorNotice error={error ?? pay.error} />
    <footer className={styles.dialogFoot}><Button className="w-auto" variant="secondary" disabled={pay.pending} onClick={onClose}>Bỏ qua</Button><Button className="w-auto" isPending={pay.pending} onClick={() => void save()}>Tạo phiếu chi</Button></footer>
  </div></Dialog>;
}
