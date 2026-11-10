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
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { AccountPicker } from "@/features/cash-book/cash-pickers";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { MoneyInput, fmt, nowLocal, viDate, viDateTime } from "@/features/purchase-documents/document-parts";
import { vnInstant } from "@/features/purchase-documents/repository";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import { messageCatalog } from "@/shared/messages/message-catalog";
import { AllocationTable, useAllocation } from "./allocation";
import { PAYMENT, methodLabel, type PaymentDetails, type PaymentForm } from "./contracts";
import { customerHref, invoiceHref } from "./customer-links";
import { CustomerQrDialog, asCashAccounts, type QrShown } from "./customer-qr-dialog";
import { customerRepository, errorText, type Result } from "./repository";
import styles from "./customers.module.css";

type Method = "Cash" | "OtherTransfer";
const methods: readonly (readonly [Method, string])[] = [["Cash", "Tiền mặt"], ["OtherTransfer", "Chuyển khoản"]];
const empty = "Khách hàng không còn hóa đơn nào chưa thu hết; khoản này chỉ trừ vào công nợ.";

export function VoucherField({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return <div className={wide ? `${purchaseStyles.voucherField} ${purchaseStyles.voucherWide}` : purchaseStyles.voucherField}><span>{label}</span>{children}</div>;
}
function MethodChoice({ value, onChange }: { value: Method; onChange(value: Method): void }) {
  return <div className={purchaseStyles.methods} role="radiogroup" aria-label="Phương thức thanh toán">{methods.map(([key, label]) => <label key={key}><input type="radio" className="sr-only" name="customer-payment-method" checked={value === key} onChange={() => onChange(key)} />{label}</label>)}</div>;
}
const signed = (value: number) => value < 0 ? `-${fmt(-value)}` : fmt(value);

/**
 * "Thanh toán" and "Chiết khấu thanh toán": money from the customer (or a discount) set against its unpaid invoices. Both are the same
 * document; the discount one has no money, method or bank. "Tạo phiếu thu & In QR" makes a payment that waits for the transfer.
 */
export function CustomerPaymentDialog({ customerId, mode, onClose, onSaved }: { customerId: string; mode: "payment" | "discount"; onClose(): void; onSaved(): void }) {
  const form = useRemote(useCallback((signal: AbortSignal) => customerRepository.paymentForm(customerId, signal), [customerId]));
  return <Dialog open size="xl" title={mode === "payment" ? "Thanh toán" : "Chiết khấu thanh toán"} onOpenChange={(open) => { if (!open) onClose(); }}><div className={`${managementStyles.theme} ${purchaseStyles.voucher}`}>
    {form.loading ? <Skeleton /> : form.error || !form.data ? <ListStateMessage error={form.error ?? "Không tải được công nợ."} onRetry={form.reload} /> : <PaymentForm_ data={form.data} customerId={customerId} mode={mode} onClose={onClose} onSaved={onSaved} />}
  </div></Dialog>;
}

function PaymentForm_({ data, customerId, mode, onClose, onSaved }: { data: PaymentForm; customerId: string; mode: "payment" | "discount"; onClose(): void; onSaved(): void }) {
  const { notify } = useToast(), confirmation = useActionDialog(), discountMode = mode === "discount";
  const accounts = useMemo(() => asCashAccounts(data.bankAccounts), [data.bankAccounts]);
  const [code, setCode] = useState(""), [paidAt, setPaidAt] = useState(nowLocal), [collectorId, setCollectorId] = useState(""), [method, setMethod] = useState<Method>("Cash"), [bankReference, setBankReference] = useState("");
  const [cashAccountId, setCashAccountId] = useState(() => data.bankAccounts.find((row) => row.isDefault)?.id ?? data.bankAccounts[0]?.id ?? "");
  const [amount, setAmount] = useState(0), [discount, setDiscount] = useState(0), [note, setNote] = useState(""), [allocate, setAllocate] = useState(true);
  const [error, setError] = useState<string>(), [pending, setPending] = useState<"save" | "qr">(), [key] = useState(() => crypto.randomUUID()), [qr, setQr] = useState<QrShown>();
  const invoices = data.unpaidInvoices;
  const paying = amount + discount, remainingDebt = data.debt - paying;
  const allocation = useAllocation(invoices, paying, discountMode ? 0 : discount, discountMode ? (value) => setDiscount(value) : setAmount);
  const allocated = allocate ? allocation.allocated : 0;
  // In the discount form the single amount is the discount; in the payment form there is no discount.
  const setMoney = (next: number) => { if (discountMode) setDiscount(next); else setAmount(next); allocation.respread(next); };
  const money = discountMode ? discount : amount;

  async function submit(asQr: boolean, confirmAboveDebt = false, confirmDuplicateBankReference = false): Promise<void> {
    if (money <= 0) { setError(discountMode ? "Nhập số tiền chiết khấu lớn hơn 0." : "Nhập số tiền lớn hơn 0."); return; }
    if (!asQr && !discountMode && method === "OtherTransfer" && !bankReference.trim()) { setError("Nhập mã giao dịch ngân hàng."); return; }
    if ((asQr || method === "OtherTransfer") && !discountMode && !cashAccountId) { setError("Chọn tài khoản nhận tiền. Nếu chưa có, thêm tài khoản ngân hàng trong Thiết lập → Sổ quỹ."); return; }
    if (allocated > paying) { setError("Tổng tiền phân bổ vượt số tiền thu."); return; }
    const over = allocate ? allocation.over() : undefined;
    if (over) { setError(`Hóa đơn ${over.code} chỉ còn cần thu ${fmt(over.unpaid)} đ.`); return; }
    setPending(asQr ? "qr" : "save"); setError(undefined);
    const base = { customerId, amount: discountMode ? 0 : amount, discountAmount: discountMode ? discount : 0, note: note.trim() || null, code: code.trim() || null, collectedByAccountId: collectorId || null, deduplicationKey: key,
      allocations: allocate ? allocation.named() : undefined };
    const result = asQr
      ? await customerRepository.pendingTransfer({ ...base, cashAccountId })
      : await customerRepository.pay({ ...base, paidAt: vnInstant(paidAt), ...(discountMode ? {} : { method, ...(method === "OtherTransfer" ? { bankReference: bankReference.trim(), cashAccountId: cashAccountId || null } : {}) }), confirmAboveDebt, confirmDuplicateBankReference });
    setPending(undefined);
    if (result.status === "success") {
      const saved = result.data;
      if (asQr && saved.qr) { notify({ tone: "success", title: `Đã tạo phiếu thu ${saved.payment.code}, chờ khách chuyển khoản.` }); setQr({ payment: saved.payment, qr: saved.qr }); return; }
      notify({ tone: "success", title: `Đã tạo phiếu ${discountMode ? "chiết khấu" : "thu"} ${saved.payment.code}.` });
      onSaved();
      return;
    }
    if (result.code === "MSG-DEBT-04" && await confirmation.confirm(`${messageCatalog["MSG-DEBT-04"]} Phần vượt: ${fmt(-remainingDebt)} đ.`)) return submit(asQr, true, confirmDuplicateBankReference);
    if (result.code === "MSG-DEBT-05" && await confirmation.confirm(messageCatalog["MSG-DEBT-05"])) return submit(asQr, confirmAboveDebt, true);
    setError(result.problem?.field ? `${errorText(result)} Kiểm tra: ${result.problem.field}.` : errorText(result));
  }

  const busy = pending !== undefined;
  return <>{confirmation.dialog}
    <p className={purchaseStyles.voucherSub}><Link className={purchaseStyles.link} href={data.customer.code ? customerHref(data.customer.code) : "#"}>{data.customer.name}</Link>
      <span className={purchaseStyles.debtChip}>{data.debt < 0 ? "Cần trả lại khách" : "Nợ hiện tại"}: <strong>{fmt(Math.abs(data.debt))}</strong></span></p>
    <div className={purchaseStyles.voucherGrid}>
      <VoucherField label={discountMode ? "Mã phiếu chiết khấu" : "Mã phiếu thu"}><input className={purchaseStyles.voucherInput} aria-label="Mã phiếu" maxLength={25} placeholder="Mã phiếu tự động" value={code} onChange={(event) => setCode(event.target.value.replace(/\s/g, ""))} /></VoucherField>
      <div />
      <VoucherField label="Thời gian"><DatePickerField label="Thời gian thu" withTime value={paidAt} max={nowLocal()} onChange={setPaidAt} /></VoucherField>
      <VoucherField label="Người thu"><PersonPicker label="Người thu" people={data.cashCollectors} value={collectorId} placeholder="Người đang đăng nhập" onChange={setCollectorId} /></VoucherField>
      {!discountMode && <>
        <VoucherField label="Phương thức thanh toán"><MethodChoice value={method} onChange={setMethod} /></VoucherField>
        {method === "OtherTransfer" ? <VoucherField label="Mã giao dịch ngân hàng *"><input className={purchaseStyles.voucherInput} maxLength={100} value={bankReference} onChange={(event) => setBankReference(event.target.value)} /></VoucherField> : <div />}
        {method === "OtherTransfer" && <><VoucherField label="Tài khoản nhận *"><AccountPicker label="Tài khoản nhận" accounts={accounts} value={cashAccountId} onChange={setCashAccountId} /></VoucherField><div /></>}
      </>}
      <VoucherField label={discountMode ? "Chiết khấu thanh toán" : "Số tiền"}><MoneyInput label={discountMode ? "Số tiền chiết khấu" : "Số tiền thu"} className={`${purchaseStyles.voucherInput} ${purchaseStyles.voucherMoney}`} value={money} onChange={setMoney} /></VoucherField>
      <VoucherField label="Nợ còn"><input className={`${purchaseStyles.voucherInput} ${purchaseStyles.voucherMoney}`} readOnly aria-label="Nợ còn" value={signed(remainingDebt)} /></VoucherField>
      <VoucherField label="Ghi chú" wide><textarea className={purchaseStyles.voucherNote} placeholder="Nhập ghi chú" maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></VoucherField>
    </div>
    <label className={purchaseStyles.allocateToggle}><input type="checkbox" checked={allocate} onChange={(event) => { setAllocate(event.target.checked); if (event.target.checked) allocation.respread(paying); }} />Phân bổ vào hóa đơn</label>
    {allocate && <AllocationTable invoices={invoices} applied={allocation.applied} onChange={allocation.change} emptyText={empty} moneyLabel={discountMode ? "Chiết khấu" : "Tiền thu"} />}
    <p className={purchaseStyles.unallocated}>Tiền chưa phân bổ: <strong>{fmt(Math.max(0, paying - allocated))}</strong></p>
    <ErrorNotice error={error} />
    <footer className={purchaseStyles.dialogFoot}>
      <Button className="w-auto" variant="secondary" disabled={busy} onClick={onClose}>Bỏ qua</Button>
      {!discountMode && <Button className="w-auto" variant="secondary" isPending={pending === "qr"} disabled={busy} onClick={() => void submit(true)}><InterfaceIcon name="receipt" className="mr-1 size-4" />Tạo phiếu thu &amp; In QR</Button>}
      <Button className="w-auto" isPending={pending === "save"} disabled={busy} onClick={() => void submit(false)}>{discountMode ? "Tạo phiếu chiết khấu" : "Tạo phiếu thu"}</Button>
    </footer>
    {qr && <CustomerQrDialog shown={qr} onClose={() => { setQr(undefined); onSaved(); }} />}
  </>;
}

/** "Điều chỉnh": a signed correction of the debt with its reason; it appears in the debt tab and can be cancelled there. */
export function AdjustmentDialog({ customerId, onClose, onSaved }: { customerId: string; onClose(): void; onSaved(): void }) {
  const form = useRemote(useCallback((signal: AbortSignal) => customerRepository.paymentForm(customerId, signal), [customerId]));
  const { notify } = useToast();
  const [direction, setDirection] = useState<"up" | "down">("up"), [amount, setAmount] = useState(0), [reason, setReason] = useState(""), [at, setAt] = useState(nowLocal), [error, setError] = useState<string>(), [pending, setPending] = useState(false);
  const debt = form.data?.debt ?? 0, change = direction === "up" ? amount : -amount;
  async function save() {
    if (amount <= 0) { setError("Nhập số tiền điều chỉnh lớn hơn 0."); return; }
    if (!reason.trim()) { setError("Nhập lý do điều chỉnh."); return; }
    setPending(true); setError(undefined);
    const result = await customerRepository.adjust({ customerId, amount: change, reason: reason.trim(), occurredAt: vnInstant(at) });
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã tạo phiếu điều chỉnh ${result.data.adjustment.code}.` }); onSaved(); return; }
    setError(result.problem?.field ? `${errorText(result)} Kiểm tra: ${result.problem.field}.` : errorText(result));
  }
  return <Dialog open size="md" dismissible={!pending} title="Điều chỉnh công nợ" onOpenChange={(open) => { if (!open && !pending) onClose(); }}><div className={`${managementStyles.theme} ${purchaseStyles.voucher}`}>
    {form.loading ? <Skeleton /> : form.error || !form.data ? <ListStateMessage error={form.error ?? "Không tải được công nợ."} onRetry={form.reload} /> : <>
      <p className={purchaseStyles.voucherSub}>{form.data.customer.name}<span className={purchaseStyles.debtChip}>Nợ hiện tại: <strong>{signed(debt)}</strong></span></p>
      <div className={purchaseStyles.voucherGrid}>
        <VoucherField label="Thời gian" wide><DatePickerField label="Thời gian điều chỉnh" withTime value={at} max={nowLocal()} onChange={setAt} /></VoucherField>
        <VoucherField label="Loại điều chỉnh" wide><div className={styles.radioRow}>
          <label><input type="radio" name="adjustment-direction" checked={direction === "up"} onChange={() => setDirection("up")} />Tăng nợ khách</label>
          <label><input type="radio" name="adjustment-direction" checked={direction === "down"} onChange={() => setDirection("down")} />Giảm nợ khách</label></div></VoucherField>
        <VoucherField label="Số tiền điều chỉnh"><MoneyInput label="Số tiền điều chỉnh" className={`${purchaseStyles.voucherInput} ${purchaseStyles.voucherMoney}`} value={amount} onChange={setAmount} /></VoucherField>
        <VoucherField label="Nợ sau điều chỉnh"><input className={`${purchaseStyles.voucherInput} ${purchaseStyles.voucherMoney}`} readOnly aria-label="Nợ sau điều chỉnh" value={signed(debt + change)} /></VoucherField>
        <VoucherField label="Lý do *" wide><textarea className={purchaseStyles.voucherNote} maxLength={1000} placeholder="Nhập lý do điều chỉnh" value={reason} onChange={(event) => setReason(event.target.value)} /></VoucherField>
      </div>
      <ErrorNotice error={error} />
      <footer className={purchaseStyles.dialogFoot}><Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Bỏ qua</Button><Button className="w-auto" isPending={pending} onClick={() => void save()}>Lưu điều chỉnh</Button></footer>
    </>}
  </div></Dialog>;
}

export const paymentStatus = (payment: Pick<PaymentDetails, "statusId">) =>
  payment.statusId === PAYMENT.completed ? { label: "Hoàn thành", tone: "success" as const } : payment.statusId === PAYMENT.cancelled ? { label: "Đã hủy", tone: "danger" as const }
    : payment.statusId === PAYMENT.pending ? { label: "Chờ chuyển khoản", tone: "neutral" as const } : { label: "Chờ xác nhận", tone: "neutral" as const };

/** A customer payment opened from the debt tab or the cash book: what it was, which invoices it paid, and what can still be done with it. */
export function CustomerPaymentView({ id, canConfirm, canCancel, onClose }: { id: string; canConfirm: boolean; canCancel: boolean; onClose(changed?: boolean): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => customerRepository.payment(id, signal), [id]));
  const { notify } = useToast(), confirmation = useActionDialog();
  const [error, setError] = useState<string>(), [pending, setPending] = useState(false), [qr, setQr] = useState(false);
  const payment = remote.data;
  if (remote.loading || remote.error || !payment) return <Dialog open size="xl" title="Phiếu thu" onOpenChange={(open) => { if (!open) onClose(); }}>{remote.loading ? <Skeleton /> : <ListStateMessage error={remote.error ?? "Không tải được phiếu."} onRetry={remote.reload} />}</Dialog>;
  const status = paymentStatus(payment), paidBack = payment.kind === "PaidBack", word = paidBack ? "chi trả lại khách" : "thu", allocations = payment.allocations ?? [];
  const allocated = allocations.reduce((sum, row) => sum + row.amount, 0), cancelled = payment.statusId === PAYMENT.cancelled;
  async function act(run: () => Promise<Result<unknown>>, title: string) {
    setPending(true); setError(undefined);
    const result = await run();
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title }); onClose(true); } else setError(errorText(result));
  }
  async function cancel() {
    const reason = await confirmation.prompt(`Hủy phiếu ${word} ${payment!.code}?${payment!.statusId === PAYMENT.pending ? "" : " Công nợ khách hàng sẽ được tính lại."}`);
    if (reason) await act(() => customerRepository.cancelPayment(payment!.id, reason, payment!.rowVersion), `Đã hủy phiếu ${word} ${payment!.code}.`);
  }
  return <Dialog open size="xl" dismissible={!pending} title={paidBack ? "Phiếu chi trả lại khách" : "Phiếu thu"} onOpenChange={(open) => { if (!open && !pending) onClose(); }}><div className={`${managementStyles.theme} ${purchaseStyles.voucher}`}>{confirmation.dialog}
    <p className={purchaseStyles.voucherSub}>{payment.customer ? <Link className={purchaseStyles.link} href={payment.customer.code ? customerHref(payment.customer.code) : "#"}>{payment.customer.name}</Link> : "Khách lẻ"}<StatusPill tone={status.tone}>{status.label}</StatusPill></p>
    <div className={purchaseStyles.voucherGrid}>
      <VoucherField label="Mã phiếu"><input className={purchaseStyles.voucherInput} readOnly value={payment.code} /></VoucherField>
      <VoucherField label="Người tạo"><input className={purchaseStyles.voucherInput} readOnly value={payment.recordedBy?.name ?? "—"} /></VoucherField>
      <VoucherField label="Thời gian"><input className={purchaseStyles.voucherInput} readOnly value={payment.paidAt ? viDateTime(payment.paidAt) : viDate(payment.paymentDate)} /></VoucherField>
      <VoucherField label={paidBack ? "Người chi" : "Người thu"}><input className={purchaseStyles.voucherInput} readOnly value={payment.collectedBy?.name ?? "—"} /></VoucherField>
      <VoucherField label="Phương thức thanh toán"><input className={purchaseStyles.voucherInput} readOnly value={methodLabel(payment.method) || "—"} /></VoucherField>
      <VoucherField label="Tài khoản"><input className={purchaseStyles.voucherInput} readOnly value={payment.cashAccount ? `${payment.cashAccount.accountNumber} - ${payment.cashAccount.providerName}` : "—"} /></VoucherField>
      {payment.bankReference && <VoucherField label="Mã giao dịch ngân hàng"><input className={purchaseStyles.voucherInput} readOnly value={payment.bankReference} /></VoucherField>}
      {payment.invoice && <VoucherField label="Hóa đơn"><Link className={purchaseStyles.link} href={invoiceHref(payment.invoice.code)}>{payment.invoice.code}</Link></VoucherField>}
      <VoucherField label="Số tiền" wide><input className={`${purchaseStyles.voucherInput} ${purchaseStyles.voucherMoney} ${purchaseStyles.voucherTotal}`} readOnly value={fmt(payment.amount)} /></VoucherField>
      {!!payment.discountAmount && <VoucherField label="Chiết khấu thanh toán" wide><input className={`${purchaseStyles.voucherInput} ${purchaseStyles.voucherMoney}`} readOnly value={fmt(payment.discountAmount)} /></VoucherField>}
      <VoucherField label="Ghi chú" wide><textarea className={purchaseStyles.voucherNote} readOnly value={payment.note ?? ""} placeholder="Không có ghi chú" /></VoucherField>
      {payment.cancelReason && <VoucherField label="Lý do hủy" wide><p className={purchaseStyles.danger}>{payment.cancelReason}</p></VoucherField>}
    </div>
    {!paidBack && <>
      <p className={purchaseStyles.allocateToggle}>Phân bổ vào hóa đơn</p>
      {allocations.length > 0 ? <div className={purchaseStyles.innerScroll}><table className={purchaseStyles.inner}><thead><tr><th>Mã hóa đơn</th><th>Thời gian</th><th className={purchaseStyles.num}>Giá trị</th><th className={purchaseStyles.num}>Tiền thu</th></tr></thead>
        <tbody><tr className={purchaseStyles.totalRow}><td colSpan={3} /><td className={purchaseStyles.num}>{fmt(allocated)}</td></tr>
          {allocations.map((row) => <tr key={row.invoiceId}><td><Link className={managementStyles.linkButton} href={invoiceHref(row.invoiceCode)}>{row.invoiceCode}</Link></td><td>{row.invoicedAt ? viDateTime(row.invoicedAt) : "—"}</td><td className={purchaseStyles.num}>{fmt(row.invoiceTotal)}</td><td className={purchaseStyles.num}>{fmt(row.amount)}</td></tr>)}</tbody></table></div>
        : <p className={styles.hint}>Phiếu không phân bổ vào hóa đơn nào: nó trừ vào công nợ chung, hoặc thuộc phiếu cũ được tính vào hóa đơn cũ nhất trước.</p>}
      <p className={purchaseStyles.unallocated}>Tiền chưa phân bổ: <strong>{fmt(Math.max(0, payment.amount + (payment.discountAmount ?? 0) - allocated))}</strong></p>
    </>}
    <ErrorNotice error={error} />
    <footer className={`${purchaseStyles.dialogFoot} ${purchaseStyles.voucherFoot}`}>
      <div>{!cancelled && canCancel && <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => void cancel()}><InterfaceIcon name="trash" className="size-4" />Hủy phiếu</Button>}</div>
      <div>
        {payment.statusId === PAYMENT.pending && <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => setQr(true)}>In lại mã QR</Button>}
        {payment.statusId === PAYMENT.awaiting && canConfirm && <Button className="w-auto" isPending={pending} onClick={() => void act(() => customerRepository.confirmPayment(payment.id), `Đã xác nhận phiếu thu ${payment.code}.`)}>Xác nhận đã nhận tiền</Button>}
        <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => onClose()}>Đóng</Button>
      </div>
    </footer>
    {qr && <CustomerQrDialog reprintId={payment.id} onClose={() => setQr(false)} />}
  </div></Dialog>;
}
