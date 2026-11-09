"use client";
import Link from "next/link";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { ListStateMessage, managementStyles } from "@/components/ui/management-screen/management-table";
import { PersonPicker } from "@/components/ui/management-screen/person-picker";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import type { PaymentView } from "./contracts";
import { MoneyInput, errorText, fmt, nowLocal, viDateTime, vnLocal } from "./document-parts";
import { ReceiptViewDialog } from "./document-dialogs";
import { supplierHref } from "./receipt-detail";
import { cancelPayment, createPayment, editPayment, getPayment, getSupplierDebt, listPayers } from "./repository";
import styles from "./purchases.module.css";

type Method = "Cash" | "BankTransfer";
const methods: readonly (readonly [Method, string])[] = [["Cash", "Tiền mặt"], ["BankTransfer", "Chuyển khoản"]];

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return <div className={wide ? `${styles.voucherField} ${styles.voucherWide}` : styles.voucherField}><span>{label}</span>{children}</div>;
}
function MethodChoice({ value, onChange }: { value: Method; onChange(value: Method): void }) {
  return <div className={styles.methods} role="radiogroup" aria-label="Phương thức thanh toán">{methods.map(([key, label]) => <label key={key}><input type="radio" className="sr-only" name="payment-method" checked={value === key} onChange={() => onChange(key)} />{label}</label>)}</div>;
}
function usePayers() {
  const remote = useRemote(useCallback((signal: AbortSignal) => listPayers(signal), []));
  return remote.data ?? [];
}

/** Spreads an amount over unpaid receipts oldest first, the way the cooperative usually settles them. */
function spread(amount: number, receipts: readonly { id: string; remaining: number }[]) {
  let left = amount;
  return Object.fromEntries(receipts.map((receipt) => { const take = Math.max(0, Math.min(left, receipt.remaining)); left -= take; return [receipt.id, take]; }));
}

/** "Thanh toán": pays the supplier and sets the money against its unpaid receipts; what is left over stays an advance. */
export function PaymentCreateDialog({ supplierId, onClose, onSaved }: { supplierId: string; onClose(): void; onSaved(): void }) {
  const debt = useRemote(useCallback((signal: AbortSignal) => getSupplierDebt(supplierId, signal), [supplierId]));
  const payers = usePayers(), confirmation = useActionDialog();
  const [code, setCode] = useState(""), [paidAt, setPaidAt] = useState(nowLocal), [paidById, setPaidById] = useState(""), [method, setMethod] = useState<Method>("Cash"), [bankReference, setBankReference] = useState("");
  const [amount, setAmount] = useState(0), [discount, setDiscount] = useState(0), [note, setNote] = useState(""), [allocate, setAllocate] = useState(true);
  const [applied, setApplied] = useState<Record<string, number>>({}), [error, setError] = useState<string>(), [pending, setPending] = useState(false), [key] = useState(() => crypto.randomUUID());
  const receipts = useMemo(() => [...(debt.data?.unpaidReceipts ?? [])].sort((a, b) => a.receiptDate.localeCompare(b.receiptDate) || a.code.localeCompare(b.code)), [debt.data]);
  const paying = amount + discount, allocated = allocate ? receipts.reduce((sum, receipt) => sum + (applied[receipt.id] ?? 0), 0) : 0;
  const remainingDebt = (debt.data?.debtToday ?? 0) - paying;
  const changeAmount = (next: number, nextDiscount = discount) => { setAmount(next); setApplied(spread(next + nextDiscount, receipts)); };
  const [opened, setOpened] = useState<string>();

  async function save(confirmAdvance = false, confirmDuplicateBankReference = false) {
    if (paying <= 0) { setError("Nhập số tiền hoặc chiết khấu lớn hơn 0."); return; }
    if (method === "BankTransfer" && !bankReference.trim()) { setError("Nhập mã giao dịch ngân hàng."); return; }
    if (allocated > paying) { setError("Tổng tiền phân bổ vượt số tiền thanh toán."); return; }
    const over = receipts.find((receipt) => (applied[receipt.id] ?? 0) > receipt.remaining);
    if (allocate && over) { setError(`Phiếu ${over.code} chỉ còn cần trả ${fmt(over.remaining)} đ.`); return; }
    setPending(true); setError(undefined);
    const result = await createPayment({ code, supplierId, paidAt, paidById, amount, discountAmount: discount, method, bankReference, note, confirmAdvance, confirmDuplicateBankReference, deduplicationKey: key,
      allocations: allocate ? receipts.filter((receipt) => (applied[receipt.id] ?? 0) > 0).map((receipt) => ({ receiptId: receipt.id, amount: applied[receipt.id] })) : null });
    setPending(false);
    if (result.status === "success") { onSaved(); return; }
    if (result.code === "MSG-PURCHASE-05" && await confirmation.confirm(`Khoản chi vượt công nợ hiện tại. Ghi phần vượt ${fmt(-remainingDebt)} đ là tiền trả trước cho nhà cung cấp?`)) return save(true, confirmDuplicateBankReference);
    if (result.code === "MSG-PURCHASE-06" && await confirmation.confirm("Mã giao dịch ngân hàng này đã được ghi trước đó. Đã đối chiếu và vẫn ghi phiếu chi này?")) return save(confirmAdvance, true);
    setError(errorText(result));
  }

  const supplier = debt.data?.supplier;
  return <Dialog open size="xl" dismissible={!pending} title="Thanh toán" onOpenChange={(open) => { if (!open) onClose(); }}><div className={`${managementStyles.theme} ${styles.voucher}`}>{confirmation.dialog}
    {debt.loading ? <Skeleton /> : debt.error || !supplier ? <ListStateMessage error={debt.error ?? "Không tải được công nợ."} onRetry={debt.reload} /> : <>
      <p className={styles.voucherSub}><Link className={styles.link} href={supplierHref({ supplier })}>{supplier.name}</Link><span className={styles.debtChip}>Nợ hiện tại: <strong>{fmt(debt.data!.debtToday)}</strong></span></p>
      <div className={styles.voucherGrid}>
        <Field label="Mã phiếu chi"><input className={styles.voucherInput} aria-label="Mã phiếu chi" maxLength={30} placeholder="Mã phiếu tự động" value={code} onChange={(event) => setCode(event.target.value.replace(/\s/g, ""))} /></Field>
        <div />
        <Field label="Thời gian"><DatePickerField label="Thời gian chi" withTime value={paidAt} max={nowLocal()} onChange={setPaidAt} /></Field>
        <Field label="Người chi"><PersonPicker label="Người chi" people={payers} value={paidById} placeholder="Người đang đăng nhập" onChange={setPaidById} /></Field>
        <Field label="Phương thức thanh toán"><MethodChoice value={method} onChange={setMethod} /></Field>
        {method === "BankTransfer" ? <Field label="Mã giao dịch ngân hàng *"><input className={styles.voucherInput} maxLength={100} value={bankReference} onChange={(event) => setBankReference(event.target.value)} /></Field> : <div />}
        <Field label="Số tiền"><MoneyInput label="Số tiền chi" className={`${styles.voucherInput} ${styles.voucherMoney}`} value={amount} onChange={(next) => changeAmount(next)} /></Field>
        <Field label="Nợ còn"><input className={`${styles.voucherInput} ${styles.voucherMoney}`} readOnly value={fmt(remainingDebt)} /></Field>
        <Field label="Chiết khấu thanh toán"><MoneyInput label="Chiết khấu thanh toán" className={`${styles.voucherInput} ${styles.voucherMoney}`} value={discount} onChange={(next) => { setDiscount(next); setApplied(spread(amount + next, receipts)); }} /></Field>
        <div />
        <Field label="Ghi chú" wide><textarea className={styles.voucherNote} placeholder="Nhập ghi chú" maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></Field>
      </div>
      <label className={styles.allocateToggle}><input type="checkbox" checked={allocate} onChange={(event) => { setAllocate(event.target.checked); if (event.target.checked) setApplied(spread(paying, receipts)); }} />Phân bổ vào phiếu nhập</label>
      {allocate && <div className={styles.innerScroll}><table className={styles.inner}><thead><tr><th>Mã phiếu</th><th>Thời gian</th><th className={styles.num}>Giá trị phiếu nhập</th><th className={styles.num}>Đã trả trước</th><th className={styles.num}>Còn cần trả</th><th className={styles.num}>Tiền trả</th><th className={styles.num}>Còn nợ</th></tr></thead>
        <tbody>
          <tr className={styles.totalRow}><td colSpan={4} /><td className={styles.num}>{fmt(receipts.reduce((sum, receipt) => sum + receipt.remaining, 0))}</td><td className={styles.num}>{fmt(allocated)}</td><td className={styles.num}>{fmt(receipts.reduce((sum, receipt) => sum + receipt.remaining - (applied[receipt.id] ?? 0), 0))}</td></tr>
          {receipts.map((receipt) => <tr key={receipt.id}>
            <td><button type="button" className={managementStyles.linkButton} onClick={() => setOpened(receipt.id)}>{receipt.code}</button></td>
            <td>{receipt.receivedAt ? viDateTime(receipt.receivedAt) : receipt.receiptDate.split("-").reverse().join("/")}</td>
            <td className={styles.num}>{fmt(receipt.total - (receipt.discount ?? 0))}</td><td className={styles.num}>{fmt(receipt.covered + receipt.returned)}</td><td className={styles.num}>{fmt(receipt.remaining)}</td>
            <td className={styles.num}><MoneyInput label={`Tiền trả phiếu ${receipt.code}`} className={styles.cellInput} invalid={(applied[receipt.id] ?? 0) > receipt.remaining} value={applied[receipt.id] ?? 0} onChange={(value) => setApplied((current) => ({ ...current, [receipt.id]: value }))} /></td>
            <td className={styles.num}>{fmt(receipt.remaining - (applied[receipt.id] ?? 0))}</td></tr>)}
          {!receipts.length && <tr><td colSpan={7} className={styles.empty}>Nhà cung cấp không còn phiếu nhập nào chưa trả hết; khoản chi sẽ là tiền trả trước.</td></tr>}
        </tbody></table></div>}
      <p className={styles.unallocated}>Tiền chưa phân bổ: <strong>{fmt(Math.max(0, paying - allocated))}</strong></p>
      <ErrorNotice error={error} />
      <footer className={styles.dialogFoot}><Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Bỏ qua</Button><Button className="w-auto" isPending={pending} onClick={() => void save()}>Tạo phiếu chi</Button></footer>
    </>}
    {opened && <ReceiptViewDialog id={opened} onClose={() => setOpened(undefined)} />}
  </div></Dialog>;
}

/** "Phiếu chi" or money paid back: who, when and how can be corrected; the money and its allocation cannot. */
export function PaymentVoucherDialog({ id, onClose }: { id: string; onClose(changed?: boolean): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => getPayment(id, signal), [id]));
  if (remote.loading) return <Dialog open size="xl" title="Phiếu chi" onOpenChange={(open) => { if (!open) onClose(); }}><Skeleton /></Dialog>;
  if (remote.error || !remote.data) return <Dialog open size="xl" title="Phiếu chi" onOpenChange={(open) => { if (!open) onClose(); }}><ListStateMessage error={remote.error ?? "Không tải được phiếu chi."} onRetry={remote.reload} /></Dialog>;
  return <Voucher key={remote.data.rowVersion} payment={remote.data} onClose={onClose} />;
}

function Voucher({ payment, onClose }: { payment: PaymentView; onClose(changed?: boolean): void }) {
  const payers = usePayers(), confirmation = useActionDialog();
  const cancelled = payment.statusId === 1802, paidBack = payment.kind === "PaidBack";
  const editableMethod = payment.method === "Other" ? "Cash" : payment.method;
  const initial = { paidAt: vnLocal(payment.paidAt ?? `${payment.paymentDate}T00:00:00+07:00`), paidById: payment.paidBy?.id ?? "", method: editableMethod, bankReference: payment.bankReference ?? "", note: payment.note ?? "" };
  const [values, setValues] = useState(initial), [error, setError] = useState<string>(), [pending, setPending] = useState(false), [opened, setOpened] = useState<string>();
  const set = <K extends keyof typeof initial>(key: K, value: (typeof initial)[K]) => setValues((current) => ({ ...current, [key]: value }));
  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((key) => values[key] !== initial[key]);
  const people = payment.paidBy && !payers.some((row) => row.id === payment.paidBy!.id) ? [payment.paidBy, ...payers] : payers;
  const allocations = payment.allocations ?? [], allocated = allocations.reduce((sum, row) => sum + row.amount, 0);

  async function save(confirmDuplicateBankReference = false) {
    if (values.method === "BankTransfer" && !values.bankReference.trim()) { setError("Nhập mã giao dịch ngân hàng."); return; }
    setPending(true); setError(undefined);
    const result = await editPayment(payment.id, { rowVersion: payment.rowVersion, ...values, confirmDuplicateBankReference });
    setPending(false);
    if (result.status === "success") { onClose(true); return; }
    if (result.code === "MSG-PURCHASE-06" && await confirmation.confirm("Mã giao dịch ngân hàng này đã được ghi trước đó. Đã đối chiếu và vẫn lưu?")) return save(true);
    setError(errorText(result));
  }
  async function cancel() {
    const reason = await confirmation.prompt(`Hủy ${paidBack ? "phiếu thu" : "phiếu chi"} ${payment.code}? Công nợ nhà cung cấp sẽ được tính lại.`);
    if (!reason) return;
    setPending(true);
    const result = await cancelPayment(payment.id, reason, payment.rowVersion);
    setPending(false);
    if (result.status === "success") onClose(true); else setError(errorText(result));
  }

  return <Dialog open size="xl" dismissible={!pending} title={paidBack ? "Phiếu thu (nhà cung cấp trả lại tiền)" : "Phiếu chi"} onOpenChange={(open) => { if (!open) onClose(); }}><div className={`${managementStyles.theme} ${styles.voucher}`}>{confirmation.dialog}
    <p className={styles.voucherSub}><Link className={styles.link} href={supplierHref(payment)}>{payment.supplier.name}</Link><Link className={styles.reference} href={supplierHref(payment)} aria-label="Mở nhà cung cấp" title="Mở nhà cung cấp"><InterfaceIcon name="link" /></Link>{cancelled && <StatusPill tone="danger">Đã hủy</StatusPill>}</p>
    <div className={styles.voucherGrid}>
      <Field label={paidBack ? "Mã phiếu thu" : "Mã phiếu chi"}><input className={styles.voucherInput} readOnly value={payment.code} /></Field>
      <Field label="Người tạo"><input className={styles.voucherInput} readOnly value={payment.recordedBy?.name ?? "—"} /></Field>
      <Field label="Thời gian"><DatePickerField label="Thời gian" withTime disabled={cancelled} value={values.paidAt} max={nowLocal()} onChange={(value) => set("paidAt", value)} /></Field>
      <Field label={paidBack ? "Người nhận" : "Nhân viên chi"}><PersonPicker label={paidBack ? "Người nhận" : "Nhân viên chi"} disabled={cancelled} people={people} value={values.paidById} onChange={(value) => set("paidById", value)} /></Field>
      <Field label="Phương thức thanh toán">{cancelled ? <input className={styles.voucherInput} readOnly value={methods.find(([key]) => key === payment.method)?.[1] ?? "Khác"} /> : <MethodChoice value={values.method} onChange={(value) => set("method", value)} />}</Field>
      {values.method === "BankTransfer" ? <Field label="Mã giao dịch ngân hàng *"><input className={styles.voucherInput} readOnly={cancelled} maxLength={100} value={values.bankReference} onChange={(event) => set("bankReference", event.target.value)} /></Field> : <div />}
      <Field label={paidBack ? "Tổng tiền thu" : "Tổng tiền chi"} wide><input className={`${styles.voucherInput} ${styles.voucherMoney} ${styles.voucherTotal}`} readOnly value={fmt(payment.amount)} /></Field>
      {!!payment.discountAmount && <Field label="Chiết khấu thanh toán" wide><input className={`${styles.voucherInput} ${styles.voucherMoney}`} readOnly value={fmt(payment.discountAmount)} /></Field>}
      <Field label="Ghi chú" wide><textarea className={styles.voucherNote} readOnly={cancelled} placeholder="Nhập ghi chú" maxLength={2000} value={values.note} onChange={(event) => set("note", event.target.value)} /></Field>
      {payment.cancelReason && <Field label="Lý do hủy" wide><p className={styles.danger}>{payment.cancelReason}</p></Field>}
    </div>
    {!paidBack && <>
      <label className={styles.allocateToggle}><input type="checkbox" checked={allocations.length > 0} disabled readOnly />Phân bổ vào phiếu nhập hàng</label>
      {allocations.length > 0 && <div className={styles.innerScroll}><table className={styles.inner}><thead><tr><th>Mã phiếu</th><th>Thời gian</th><th className={styles.num}>Giá trị phiếu</th><th className={styles.num}>Đã chi trước</th><th className={styles.num}>Tiền chi</th><th>Trạng thái</th></tr></thead>
        <tbody>
          <tr className={styles.totalRow}><td colSpan={4} /><td className={styles.num}>{fmt(allocated)}</td><td /></tr>
          {allocations.map((row) => <tr key={row.receiptId}><td><button type="button" className={managementStyles.linkButton} onClick={() => setOpened(row.receiptId)}>{row.receiptCode}</button></td><td>{row.receivedAt ? viDateTime(row.receivedAt) : "—"}</td>
            <td className={styles.num}>{fmt(row.receiptPayable)}</td><td className={styles.num}>{fmt(row.paidBefore)}</td><td className={styles.num}>{fmt(row.amount)}</td>
            <td><StatusPill tone={row.receiptRemaining > 0 ? "neutral" : "success"}>{row.receiptRemaining > 0 ? `Còn nợ ${fmt(row.receiptRemaining)}` : "Đã thanh toán"}</StatusPill></td></tr>)}
        </tbody></table></div>}
      <p className={styles.unallocated}>Tiền chưa phân bổ: <strong>{fmt(Math.max(0, payment.amount + (payment.discountAmount ?? 0) - allocated))}</strong></p>
    </>}
    <ErrorNotice error={error} />
    <footer className={`${styles.dialogFoot} ${styles.voucherFoot}`}>
      <div>{!cancelled && <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => void cancel()}><InterfaceIcon name="trash" className="size-4" />Hủy</Button>}</div>
      <div><Button className="w-auto" variant="secondary" disabled={pending} onClick={() => onClose()}>Bỏ qua</Button>{!cancelled && <Button className="w-auto" isPending={pending} disabled={!dirty} onClick={() => void save()}>Lưu</Button>}</div>
    </footer>
    {opened && <ReceiptViewDialog id={opened} onClose={() => setOpened(undefined)} />}
  </div></Dialog>;
}
