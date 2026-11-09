"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { PersonPicker } from "@/components/ui/management-screen/person-picker";
import { ListStateMessage, Subtabs, managementStyles } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { errorText, fmt, methodLabel, nowLocal, viDate, viDateTime, vnLocal, type usePurchaseAccess } from "./document-parts";
import { ReceiptStatus } from "./receipts-screen";
import { cancelReceipt, getReceipt, getReceiptPayments, previewCancelReceipt, removeReceipts, saveReceipt, usePurchaseLookups } from "./repository";
import { RECEIPT, RETURN, goodsTotal, lineAmount, returnStatusLabel, type CancelPreview, type Receipt } from "./types";
import styles from "./purchases.module.css";

type Access = ReturnType<typeof usePurchaseAccess>;
type Tab = "info" | "payments" | "returns";
type Header = { receivedById: string; receivedAt: string; notes: string };
export const supplierHref = (receipt: { supplier: { id: string; name: string } }) => `/workspace/suppliers?recordId=${receipt.supplier.id}&search=${encodeURIComponent(receipt.supplier.name)}`;
export const itemHref = (itemId: string) => `/workspace/input-items?recordId=${itemId}`;

export function ReceiptDetailPanel({ id, access, onChanged }: { id: string; access: Access; onChanged(message: string): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => getReceipt(id, signal), [id]));
  const [tab, setTab] = useState<Tab>("info");
  const receipt = remote.data;
  const tabs = useMemo(() => [{ key: "info" as const, label: "Thông tin" }, ...(receipt?.statusId === RECEIPT.completed ? [{ key: "payments" as const, label: "Lịch sử thanh toán" }, { key: "returns" as const, label: "Trả hàng nhập" }] : [])], [receipt?.statusId]);
  if (remote.loading) return <div className={listStyles.detail}><Skeleton /></div>;
  if (remote.error || !receipt) return <ListStateMessage error={remote.error ?? "Không tải được phiếu."} onRetry={remote.reload} retryLabel="Tải lại phiếu" />;
  return <section className={listStyles.detail} aria-label={`Chi tiết ${receipt.code}`}>
    <Subtabs<Tab> label="Nội dung phiếu nhập" tabs={tabs} value={tab} onChange={setTab} />
    <Body key={receipt.rowVersion} receipt={receipt} tab={tab} access={access} onChanged={onChanged} onSaved={remote.reload} />
  </section>;
}

function Body({ receipt, tab, access, onChanged, onSaved }: { receipt: Receipt; tab: Tab; access: Access; onChanged(message: string): void; onSaved(): void }) {
  const editable = access.edit && receipt.statusId !== RECEIPT.cancelled;
  const initial: Header = { receivedById: receipt.receivedBy?.id ?? "", receivedAt: vnLocal(receipt.receivedAt), notes: receipt.notes ?? "" };
  const [header, setHeader] = useState(initial);
  const dirty = header.receivedById !== initial.receivedById || header.receivedAt !== initial.receivedAt || header.notes !== initial.notes;
  return <div className={listStyles.tabBody}>
    {tab === "info" && <InfoTab receipt={receipt} header={header} editable={editable} onHeader={(patch) => setHeader((current) => ({ ...current, ...patch }))} />}
    {tab === "payments" && <PaymentsTab receipt={receipt} />}
    {tab === "returns" && <ReturnsTab receipt={receipt} />}
    <Actions receipt={receipt} access={access} header={dirty ? header : undefined} onChanged={onChanged} onSaved={onSaved} />
  </div>;
}

export function InfoTab({ receipt, header, editable, onHeader, headTools }: { receipt: Receipt; header: Header; editable: boolean; onHeader(patch: Partial<Header>): void; headTools?: ReactNode }) {
  const lookups = usePurchaseLookups();
  const [codeTerm, setCodeTerm] = useState(""), [nameTerm, setNameTerm] = useState("");
  const shown = receipt.lines.filter((line) => line.item.code.toLowerCase().includes(codeTerm.trim().toLowerCase()) && line.item.name.toLowerCase().includes(nameTerm.trim().toLowerCase()));
  const receivers = receipt.receivedBy && !lookups.receivers.some((row) => row.id === receipt.receivedBy!.id) ? [receipt.receivedBy, ...lookups.receivers] : lookups.receivers;
  const goods = goodsTotal(receipt.lines), quantity = receipt.lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0);
  const unitDiscounts = receipt.lines.some((line) => line.discount > 0);
  return <>
    <header className={styles.head}><div><h3>{receipt.code}</h3><ReceiptStatus statusId={receipt.statusId} />{headTools}</div></header>
    <div className={styles.headFacts}>
      <div><span>Người tạo:</span><strong>{receipt.recordedBy}</strong></div>
      <div><span>Người nhập:</span>{editable ? <PersonPicker label="Người nhập" people={receivers} value={header.receivedById} placeholder="Chọn người nhập" onChange={(receivedById) => onHeader({ receivedById })} /> : <strong>{receipt.receivedBy?.name ?? "—"}</strong>}</div>
      <div><span>Ngày nhập:</span>{editable ? <DatePickerField label="Ngày nhập" withTime value={header.receivedAt} max={nowLocal()} onChange={(receivedAt) => onHeader({ receivedAt })} /> : <strong>{header.receivedAt.replace("T", " ").split(" ").map((part, index) => index ? part : viDate(part)).join(" ")}</strong>}</div>
      <div><span>Tên NCC:</span><Link className={styles.link} href={supplierHref(receipt)}>{receipt.supplier.name}</Link></div>
      {receipt.returns.some((item) => item.statusId === RETURN.recorded) && <div><span>Mã trả hàng:</span><span className={styles.codeList}>{receipt.returns.filter((item) => item.statusId === RETURN.recorded).map((item) => <Link key={item.id} className={styles.link} href={`/operations/purchase-returns?code=${item.code}`}>{item.code}</Link>)}</span></div>}
      {receipt.cancelReason && <div><span>Lý do hủy:</span><span className={styles.danger}>{receipt.cancelReason}</span></div>}
    </div>
    <div className={styles.innerScroll}><table className={styles.inner}><thead><tr><th>Mã hàng</th><th>Tên hàng</th><th className={styles.num}>Số lượng</th><th className={styles.num}>Đơn giá</th><th className={styles.num}>Giảm giá</th><th className={styles.num}>Giá nhập</th><th className={styles.num}>Thành tiền</th></tr></thead>
      <tbody>
        <tr className={styles.lineSearch}><td style={{ width: 140 }}><input type="search" aria-label="Tìm mã hàng" placeholder="Tìm mã" value={codeTerm} onChange={(event) => setCodeTerm(event.target.value)} /></td><td><input type="search" aria-label="Tìm tên hàng" placeholder="Tìm tên hàng" value={nameTerm} onChange={(event) => setNameTerm(event.target.value)} /></td><td colSpan={5} /></tr>
        {shown.map((line) => <tr key={line.id}>
          <td>{line.item.id ? <Link className={styles.link} href={itemHref(line.item.id)}>{line.item.code}</Link> : line.item.code}</td>
          <td>{line.item.name} <span className={styles.sub}>{line.item.unit}{line.seedLotCode ? ` · Lô giống ${line.seedLotCode}` : ""}{line.supplierLotCode ? ` · Lô NCC ${line.supplierLotCode}` : ""}</span></td>
          <td className={styles.num}>{fmt(line.quantity)}</td><td className={styles.num}>{fmt(line.unitPrice)}</td><td className={styles.num}>{line.discount ? fmt(line.discount) : ""}</td>
          <td className={styles.num}>{fmt((line.unitPrice ?? 0) - line.discount)}</td><td className={styles.num}><strong>{fmt(lineAmount(line))}</strong></td></tr>)}
        {!shown.length && <tr><td colSpan={7} className={styles.empty}>Không có dòng hàng phù hợp.</td></tr>}
      </tbody></table></div>
    <div className={styles.foot}>
      <textarea className={styles.noteEdit} aria-label="Ghi chú" placeholder="Ghi chú..." readOnly={!editable} maxLength={2000} value={header.notes} onChange={(event) => onHeader({ notes: event.target.value })} />
      <div className={styles.sums}>
        <div><span>Số lượng mặt hàng</span><span>{receipt.lines.length}</span></div>
        <div><span>Tổng tiền hàng ({fmt(quantity)})</span><span>{fmt(goods)}</span></div>
        <div><span>Giảm giá{unitDiscounts ? " phiếu" : ""}</span><span>{fmt(receipt.discount)}</span></div>
        <div className={styles.strong}><span>Tổng cộng</span><span>{fmt(receipt.payable)}</span></div>
        {receipt.statusId === RECEIPT.completed && <div><span>Tiền đã trả NCC</span><span>{fmt(receipt.paid)}</span></div>}
      </div>
    </div>
  </>;
}

function PaymentsTab({ receipt }: { receipt: Receipt }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => getReceiptPayments(receipt.id, signal), [receipt.id]));
  if (remote.loading) return <Skeleton />;
  if (remote.error) return <ListStateMessage error={remote.error} onRetry={remote.reload} />;
  if (!remote.data?.length) return <p className={styles.empty}>Chưa có khoản thanh toán nào phủ phiếu này. Thanh toán tại Nhà cung cấp, mục Nợ cần trả.</p>;
  return <><div className={styles.innerScroll}><table className={styles.inner}><thead><tr><th>Mã phiếu</th><th>Thời gian</th><th>Người tạo</th><th>Phương thức</th><th>Trạng thái</th><th className={styles.num}>Tiền áp vào phiếu</th></tr></thead>
    <tbody>{remote.data.map((payment) => <tr key={payment.id}><td>{payment.code}</td><td>{viDate(payment.date)}</td><td>{payment.createdBy}</td><td>{methodLabel[payment.method]}</td><td>{payment.statusLabel}</td><td className={styles.num}>{fmt(payment.amount)}</td></tr>)}</tbody></table></div>
    <p className={styles.hint}>Thanh toán ghi theo nhà cung cấp và phủ các phiếu cũ trước; số tiền ở đây là phần áp vào phiếu này.</p></>;
}

function ReturnsTab({ receipt }: { receipt: Receipt }) {
  if (!receipt.returns.length) return <p className={styles.empty}>Phiếu này chưa có phiếu trả hàng.</p>;
  return <div className={styles.innerScroll}><table className={styles.inner}><thead><tr><th>Mã phiếu trả</th><th>Thời gian trả</th><th>Lý do</th><th className={styles.num}>Giá trị</th><th>Trạng thái</th></tr></thead>
    <tbody>{receipt.returns.map((item) => <tr key={item.id}><td><Link className={managementStyles.linkButton} href={`/operations/purchase-returns?code=${item.code}`}>{item.code}</Link></td><td>{item.returnedAt ? viDateTime(item.returnedAt) : viDate(item.date)}</td><td>{item.reason}</td><td className={styles.num}>{fmt(item.value)}</td><td>{returnStatusLabel[item.statusId]}</td></tr>)}</tbody></table></div>;
}

function Actions({ receipt, access, header, onChanged, onSaved }: { receipt: Receipt; access: Access; header?: Header; onChanged(message: string): void; onSaved(): void }) {
  const router = useRouter(), confirmation = useActionDialog();
  const [preview, setPreview] = useState<CancelPreview>(), [error, setError] = useState<string>(), [pending, setPending] = useState(false);
  const draft = receipt.statusId === RECEIPT.draft, completed = receipt.statusId === RECEIPT.completed;
  const canReturn = completed && access.create && receipt.lines.some((line) => line.returnable > 0);
  const canOpen = access.edit && (draft || completed);
  async function remove() {
    if (!(await confirmation.confirm(`Xóa phiếu tạm ${receipt.code}?`))) return;
    const result = await removeReceipts([receipt.id]);
    if (result.status === "success" && result.data) onChanged(`Đã xóa phiếu tạm ${receipt.code}.`); else setError(errorText(result) ?? "Không xóa được phiếu tạm.");
  }
  async function openCancel() {
    setError(undefined);
    const result = await previewCancelReceipt(receipt.id);
    if (result.status === "success") setPreview(result.data); else setError(errorText(result));
  }
  // Saves the header only: who received, when, and the note; the lines go back unchanged.
  async function saveHeader() {
    if (!header) return;
    setPending(true); setError(undefined);
    const result = await saveReceipt({ id: receipt.id, rowVersion: receipt.rowVersion, code: receipt.code, receivedAt: header.receivedAt, receivedById: header.receivedById, supplierId: receipt.supplier.id, discount: receipt.discount, notes: header.notes,
      lines: receipt.lines.map((line) => ({ lineId: line.id, itemId: line.item.id, quantity: line.quantity, unitPrice: line.unitPrice, discount: line.discount, supplierLotCode: line.supplierLotCode ?? "" })) }, false);
    setPending(false);
    if (result.status === "success") onSaved(); else setError(errorText(result));
  }
  return <><ErrorNotice error={error} /><footer className={listStyles.tabFooter}>{confirmation.dialog}
    <div>
      {draft && access.remove && <Button className="w-auto" variant="ghost" onClick={() => void remove()}><InterfaceIcon name="trash" className="size-4" />Xóa phiếu tạm</Button>}
      {completed && access.remove && <Button className="w-auto" variant="ghost" onClick={() => void openCancel()}><InterfaceIcon name="trash" className="size-4" />Hủy</Button>}
      {!draft && access.create && <Button className="w-auto" variant="ghost" onClick={() => router.push(`/operations/purchase-receipts/new?copy=${receipt.id}`)}><InterfaceIcon name="document" className="size-4" />Sao chép</Button>}
    </div>
    <div>
      {canOpen && <Button className="w-auto" onClick={() => router.push(`/operations/purchase-receipts/${receipt.id}/edit`)}><InterfaceIcon name="pencil" className="size-4" />Mở phiếu</Button>}
      {canOpen && <Button className="w-auto" variant="secondary" isPending={pending} disabled={!header} onClick={() => void saveHeader()}><InterfaceIcon name="check" className="size-4" />Lưu</Button>}
      {canReturn && <Button className="w-auto" variant="secondary" onClick={() => router.push(`/operations/purchase-returns/new?receipt=${receipt.id}`)}><InterfaceIcon name="upload" className="size-4" />Trả hàng nhập</Button>}
    </div>
    {preview && <CancelDialog receipt={receipt} preview={preview} onClose={() => setPreview(undefined)} onDone={() => { setPreview(undefined); onChanged(`Đã hủy phiếu ${receipt.code}.`); }} />}
  </footer></>;
}

function CancelDialog({ receipt, preview, onClose, onDone }: { receipt: Receipt; preview: CancelPreview; onClose(): void; onDone(): void }) {
  const [reason, setReason] = useState(""), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  async function submit() {
    setPending(true); setError(undefined);
    const result = await cancelReceipt(receipt.id, reason.trim(), receipt.rowVersion);
    setPending(false);
    if (result.status === "success") onDone(); else setError(errorText(result));
  }
  return <Dialog open title={`Hủy phiếu nhập ${receipt.code}`} mobileLayout="compact" dismissible={!pending} onOpenChange={(open) => { if (!open) onClose(); }}><div className={managementStyles.theme}>
    <div className={styles.previewRows}>
      <div><span>Nhà cung cấp</span><span>{receipt.supplier.name}</span></div><div><span>Tổng tiền phiếu</span><span>{fmt(receipt.payable)}</span></div>
      <div><span>Công nợ nhà cung cấp trước khi hủy</span><span>{fmt(preview.debtBefore)}</span></div><div className={styles.strong}><span>Công nợ nhà cung cấp sau khi hủy</span><span>{fmt(preview.debtAfter)}</span></div>
    </div>
    {!preview.canCancel && <p role="alert" className={styles.warning}>Chưa thể hủy phiếu: {preview.blockedBy}.</p>}
    {preview.canCancel && preview.debtAfter < 0 && <p className={styles.warning}>Sau khi hủy, hợp tác xã đã trả trước cho {receipt.supplier.name} {fmt(-preview.debtAfter)} đ. Các khoản thanh toán đã ghi không bị hủy.</p>}
    {preview.canCancel && <label className={`${styles.field} mt-3`}>Lý do hủy phiếu *<textarea autoFocus maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>}
    <ErrorNotice error={error} />
    <div className={styles.dialogFoot}><Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Bỏ qua</Button>{preview.canCancel && <Button className="w-auto" variant="danger" isPending={pending} disabled={!reason.trim()} onClick={() => void submit()}>Hủy phiếu</Button>}</div>
  </div></Dialog>;
}
