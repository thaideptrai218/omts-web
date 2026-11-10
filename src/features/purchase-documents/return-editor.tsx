"use client";
import { useToast } from "@/components/ui/toast-provider";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { DiscountInput } from "@/components/ui/management-screen/discount-input";
import { ListStateMessage, managementStyles } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { EditorFrame, ItemFinder, MoneyInput, OverflowMenu, QuantityStepper, QuickSupplierDialog, SideRow, SupplierPicker, errorText, fmt, methodLabel, nowLocal, vnLocal, usePurchaseAccess, viDate } from "./document-parts";
import { getReceipt, getReturn, removeReturn, saveReturn, usePurchaseLookups } from "./repository";
import { RETURN, goodsTotal, type ItemOption, type PaymentMethod, type PurchaseReturn, type Receipt } from "./types";
import styles from "./purchases.module.css";

type Refund = { amount: number; method: PaymentMethod; bankReference: string };
type FreeLine = { key: string; item: ItemOption; quantity: number; unitPrice: number };
type Start = { record?: PurchaseReturn; receipt?: Receipt };
const LIST = "/operations/purchase-returns";

/** A return is either bound to one receipt, where the receipt caps quantities and sets prices, or standalone with goods and prices typed in. */
export function ReturnEditorPage({ id, receiptId }: { id?: string; receiptId?: string }) {
  const remote = useRemote<Start>(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<Start>> => {
    let record: PurchaseReturn | undefined;
    if (id) { const result = await getReturn(id, signal); if (result.status !== "success") return result; record = result.data; }
    const sourceId = record?.receipt?.id ?? receiptId;
    if (!sourceId) return { status: "success", data: { record } };
    const receipt = await getReceipt(sourceId, signal);
    return receipt.status === "success" ? { status: "success", data: { record, receipt: receipt.data } } : receipt;
  }, [id, receiptId]));
  const lookups = usePurchaseLookups();
  if (remote.loading || lookups.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được phiếu."} onRetry={remote.reload} retryLabel="Tải lại" />;
  if (remote.data.record?.statusId === RETURN.cancelled) return <ListStateMessage>Phiếu {remote.data.record.code} đã hủy nên không sửa được.</ListStateMessage>;
  return <Editor record={remote.data.record} receipt={remote.data.receipt} lookups={lookups} />;
}

function Editor({ record, receipt, lookups }: { record?: PurchaseReturn; receipt?: Receipt; lookups: ReturnType<typeof usePurchaseLookups> }) {
  const access = usePurchaseAccess(), router = useRouter(), confirmation = useActionDialog(), { notify } = useToast();
  const recorded = record?.statusId === RETURN.recorded;
  // A recorded return already holds its own quantities, so editing it may go back up to what it holds plus what is still free.
  const own = Object.fromEntries(recorded ? record!.lines.flatMap((line) => line.receiptLineId ? [[line.receiptLineId, line.quantity]] : []) : []) as Record<string, number>;
  const limit = (line: Receipt["lines"][number]) => line.returnable + (own[line.id] ?? 0);
  const [returnedAt, setReturnedAt] = useState(record ? vnLocal(record.returnedAt) : nowLocal());
  const [prices, setPrices] = useState<Record<string, number>>(() => Object.fromEntries([...(receipt?.lines.map((line) => [line.id, line.netUnitPrice]) ?? []), ...(record?.lines.flatMap((line) => line.receiptLineId ? [[line.receiptLineId, line.unitPrice]] : []) ?? [])]));
  const [linked, setLinked] = useState<Record<string, number>>(() => Object.fromEntries(record?.lines.flatMap((line) => line.receiptLineId ? [[line.receiptLineId, line.quantity]] : []) ?? []));
  const [free, setFree] = useState<FreeLine[]>(() => record && !record.receipt ? record.lines.map((line) => ({ key: line.id, item: line.item, quantity: line.quantity, unitPrice: line.unitPrice })) : []);
  const [code, setCode] = useState(record?.code ?? "");
  const [supplierId, setSupplierId] = useState(record?.supplier.id ?? receipt?.supplier.id ?? ""), [reason, setReason] = useState(record?.reason ?? ""), [discount, setDiscount] = useState(record?.discount ?? 0), [refund, setRefund] = useState<Refund | null>(null);
  const [error, setError] = useState<string>(), [pending, setPending] = useState(false), [refunding, setRefunding] = useState(false), [addingSupplier, setAddingSupplier] = useState(false);
  const receiptLines = receipt?.lines.filter((line) => limit(line) > 0 || linked[line.id]) ?? [];
  const lines = receipt ? receiptLines.filter((line) => linked[line.id] > 0).map((line) => ({ receiptLineId: line.id, itemId: line.item.id, quantity: linked[line.id], unitPrice: prices[line.id] ?? line.netUnitPrice })) : free.map((line) => ({ receiptLineId: null, itemId: line.item.id, quantity: line.quantity, unitPrice: line.unitPrice }));
  const total = goodsTotal(lines), due = total - discount, paid = refund?.amount ?? 0, overLimit = receiptLines.some((line) => (linked[line.id] ?? 0) > limit(line));
  const suppliers = record && !lookups.suppliers.some((row) => row.id === record.supplier.id) ? [record.supplier, ...lookups.suppliers] : lookups.suppliers;
  const updateFree = (key: string, patch: Partial<FreeLine>) => setFree((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));

  async function save(complete: boolean) {
    if (!supplierId) { setError("Chọn nhà cung cấp."); return; }
    if (overLimit) { setError("Số lượng trả vượt số có thể trả."); return; }
    if (complete || recorded) {
      if (!lines.length || lines.some((line) => line.quantity <= 0)) { setError("Nhập số lượng trả ít nhất một dòng."); return; }
      if (recorded && receipt && Object.keys(own).some((lineId) => !(linked[lineId] > 0))) { setError("Phiếu đã trả hàng giữ nguyên các dòng hàng; số lượng mỗi dòng phải lớn hơn 0."); return; }
      if (!receipt && lines.some((line) => line.unitPrice <= 0)) { setError("Nhập giá trả cho từng dòng."); return; }
      if (!reason.trim()) { setError("Nhập lý do trả hàng."); return; }
      if (discount > total || paid > due) { setError("Giảm giá và tiền nhà cung cấp trả không được vượt giá trị phiếu."); return; }
      const supplierName = suppliers.find((row) => row.id === supplierId)?.name ?? "nhà cung cấp";
      const change = recorded ? due - record!.netValue : 0;
      const question = recorded ? `Lưu thay đổi phiếu trả ${record!.code}? ${change > 0 ? `Công nợ với ${supplierName} giảm thêm ${fmt(change)} đ.` : change < 0 ? `Công nợ với ${supplierName} tăng lại ${fmt(-change)} đ.` : "Công nợ không đổi."}` : access.owner ? `Hoàn thành phiếu trả ${fmt(due)} đ cho ${supplierName}? Phiếu không sửa được sau khi hoàn thành.` : `Chủ hợp tác xã đã đồng ý trực tiếp việc trả hàng ${fmt(due)} đ cho ${supplierName} chưa?`;
      if (!(await confirmation.confirm(question))) return;
    }
    setPending(true); setError(undefined);
    const result = await saveReturn({ id: record?.id, rowVersion: record?.rowVersion, code, returnedAt, receiptId: receipt?.id ?? null, supplierId, reason: reason.trim(), discount, ownerApproved: (complete || recorded) && !access.owner, refund: recorded ? null : refund, lines }, complete);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã lưu phiếu trả ${result.data.code}.` }); router.push(`${LIST}?code=${result.data.code}`); } else setError(errorText(result));
  }
  async function remove() {
    if (!record || !(await confirmation.confirm(`Xóa phiếu tạm ${record.code}?`))) return;
    const result = await removeReturn(record.id);
    if (result.status === "success") { notify({ tone: "success", title: `Đã xóa phiếu tạm ${record.code}.` }); router.push(LIST); } else setError(errorText(result));
  }

  return <EditorFrame title={recorded ? `Sửa phiếu trả ${record!.code}` : record ? `Phiếu trả tạm ${record.code}` : "Trả hàng nhập"} backHref={LIST} source={receipt ? `Từ phiếu nhập ${receipt.code}, nhập ngày ${viDate(receipt.date)}` : undefined}
    tools={<>{!receipt && <ItemFinder placeholder="Tìm hàng trả theo mã hoặc tên" items={lookups.items} onPick={(item) => setFree((current) => [...current, { key: crypto.randomUUID(), item, quantity: 0, unitPrice: 0 }])} />}{record?.statusId === RETURN.draft && access.remove && <OverflowMenu actionLabel="Xóa phiếu tạm" onAction={() => void remove()} />}</>}>
    {confirmation.dialog}
    <div className={styles.editorBody}>
      <div className={styles.linesPanel}>
        {receipt ? <><table className={styles.lines}><thead><tr><th className={styles.narrow}>STT</th><th>Mã hàng</th><th>Tên hàng</th><th>ĐVT</th><th className={styles.num}>Đã nhập</th><th className={styles.num}>Đã trả</th><th className={styles.num}>Đã gieo</th><th className={styles.num}>Số lượng trả</th><th className={styles.num}>Giá đã trả</th><th className={styles.num}>Giá trả lại</th><th className={styles.num}>Thành tiền</th></tr></thead>
          <tbody>{receiptLines.map((line, index) => { const value = linked[line.id] ?? 0; return <tr key={line.id}><td className={styles.narrow}>{index + 1}</td><td className={styles.code}>{line.item.code}</td><td>{line.item.name}{line.seedLotCode && <span className={styles.sub}>Lô giống {line.seedLotCode}</span>}</td><td>{line.item.unit}</td><td className={styles.num}>{fmt(line.quantity)}</td><td className={styles.num}>{fmt(line.returned)}</td><td className={styles.num}>{line.item.group === "Seed" ? fmt(line.seeded) : "—"}</td>
            <td className={styles.num}><QuantityStepper label={`số lượng trả dòng ${index + 1}`} max={limit(line)} invalid={value > limit(line)} value={value ? String(value) : ""} onChange={(next) => setLinked((current) => ({ ...current, [line.id]: Number(next.replace(",", ".")) || 0 }))} /><span className={styles.cap}>/{fmt(limit(line))}</span></td>
            <td className={styles.num} title={line.discount ? `Đơn giá ${fmt(line.unitPrice)}, giảm ${fmt(line.discount)}/đơn vị và chia giảm giá phiếu` : undefined}>{fmt(line.netUnitPrice)}</td><td><MoneyInput label={`Giá trả lại dòng ${index + 1}`} className={styles.cellInput} value={prices[line.id] ?? line.netUnitPrice} onChange={(price) => setPrices((current) => ({ ...current, [line.id]: price }))} /></td><td className={styles.amount}>{fmt(Math.round(value * (prices[line.id] ?? line.netUnitPrice)))}</td></tr>; })}</tbody></table>
          <p className={styles.hint}>Số dưới ô số lượng là phần còn được trả = Đã nhập − Đã trả − Đã gieo. Đã gieo chỉ có trên dòng Giống.</p></>
          : <><table className={styles.lines}><thead><tr><th className={styles.narrow} /><th className={styles.narrow}>STT</th><th>Mã hàng</th><th>Tên hàng</th><th>ĐVT</th><th className={styles.num}>Số lượng</th><th className={styles.num}>Giá trả lại</th><th className={styles.num}>Thành tiền</th></tr></thead>
            <tbody>{free.map((line, index) => <tr key={line.key}><td className={styles.narrow}><button type="button" className={styles.remove} aria-label={`Bỏ dòng ${index + 1}`} title="Bỏ dòng" onClick={() => setFree((current) => current.filter((row) => row.key !== line.key))}><InterfaceIcon name="trash" /></button></td><td className={styles.narrow}>{index + 1}</td><td className={styles.code}>{line.item.code}</td><td>{line.item.name}</td><td>{line.item.unit}</td>
              <td className={styles.num}><QuantityStepper label={`số lượng trả dòng ${index + 1}`} value={line.quantity ? String(line.quantity) : ""} onChange={(next) => updateFree(line.key, { quantity: Number(next.replace(",", ".")) || 0 })} /></td><td><MoneyInput label={`Giá trả dòng ${index + 1}`} className={styles.cellInput} value={line.unitPrice} onChange={(unitPrice) => updateFree(line.key, { unitPrice })} /></td><td className={styles.amount}>{fmt(Math.round(line.quantity * line.unitPrice))}</td></tr>)}</tbody></table>
            {!free.length && <div className={styles.emptyLines}><InterfaceIcon name="material" /><strong>Chưa có hàng trả</strong><span>Tìm hàng theo mã hoặc tên ở ô phía trên. Phiếu trả độc lập không gắn phiếu nhập.</span></div>}</>}
      </div>
      <aside className={styles.side} aria-label="Thông tin phiếu trả">
        <div className={styles.sideScroll}>
          <div className={styles.sideTop}><div className={styles.person} title="Người lập"><InterfaceIcon name="user" /><span>{record?.recordedBy ?? access.username}</span></div><DatePickerField label="Thời gian trả" withTime value={returnedAt} max={nowLocal()} onChange={setReturnedAt} /></div>
          <SupplierPicker suppliers={suppliers} value={supplierId} locked={!!receipt || recorded} onChange={setSupplierId} onAdd={access.addSupplier && !receipt ? () => setAddingSupplier(true) : undefined} />
          <SideRow label="Mã trả hàng nhập"><input aria-label="Mã trả hàng nhập" readOnly={recorded} maxLength={30} placeholder="Mã phiếu tự động" title={recorded ? "Phiếu đã trả hàng giữ nguyên mã" : "Để trống để hệ thống tự cấp mã"} value={code} onChange={(event) => setCode(event.target.value.replace(/\s/g, ""))} /></SideRow>
          {receipt && <SideRow label="Mã phiếu nhập">{receipt.code}</SideRow>}
          <SideRow label="Trạng thái">{recorded ? "Đã trả hàng" : "Phiếu tạm"}</SideRow>
          <div className={styles.divider} />
          <SideRow label={`Tổng tiền hàng (${lines.length})`}>{fmt(total)}</SideRow>
          <SideRow label="Giảm giá"><DiscountInput label="Giảm giá phiếu trả" base={total} value={discount} invalid={discount > total} onChange={setDiscount} /></SideRow>
          <SideRow label="Nhà cung cấp cần trả" strong>{fmt(due)}</SideRow>
          <SideRow label={<button type="button" className={styles.refundLink} onClick={() => setRefunding(true)}><InterfaceIcon name="payment" />Tiền nhà cung cấp trả</button>}><input readOnly aria-label="Tiền nhà cung cấp trả" value={fmt(paid)} onClick={() => setRefunding(true)} /></SideRow>
          {refund && paid > 0 && <p className={styles.sub}>{methodLabel[refund.method]}{refund.bankReference ? ` · ${refund.bankReference}` : ""}. Ghi nhận khi bấm Hoàn thành; Lưu tạm không giữ khoản này.</p>}
          <SideRow label="Tính vào công nợ">{fmt(-(due - paid))}</SideRow>
          <textarea className={styles.sideNote} aria-label="Lý do trả hàng" placeholder="Lý do trả hàng *" maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} />
          <ErrorNotice error={error} />
        </div>
        <div className={styles.sideActions} style={recorded ? { gridTemplateColumns: "1fr" } : undefined}>{recorded ? <Button disabled={pending} onClick={() => void save(false)}>Lưu</Button> : <><Button variant="secondary" disabled={pending} onClick={() => void save(false)}>Lưu tạm</Button><Button disabled={pending} onClick={() => void save(true)}>Hoàn thành</Button></>}</div>
      </aside>
    </div>
    {refunding && <RefundDialog due={due} value={refund} onClose={() => setRefunding(false)} onSave={(next) => { setRefund(next); setRefunding(false); }} />}
    {addingSupplier && <QuickSupplierDialog onClose={() => setAddingSupplier(false)} onSaved={(supplier) => { lookups.refresh(); setSupplierId(supplier.id); setAddingSupplier(false); }} />}
  </EditorFrame>;
}

function RefundDialog({ due, value, onClose, onSave }: { due: number; value: Refund | null; onClose(): void; onSave(value: Refund): void }) {
  const [amount, setAmount] = useState(value?.amount ?? due), [method, setMethod] = useState<PaymentMethod>(value?.method ?? "Cash"), [bankReference, setBankReference] = useState(value?.bankReference ?? "");
  const over = amount > due, missingReference = method === "BankTransfer" && amount > 0 && !bankReference.trim();
  return <Dialog open title="Tiền nhà cung cấp trả" mobileLayout="compact" onOpenChange={(open) => { if (!open) onClose(); }}><div className={managementStyles.theme}>
    <div className={styles.moneyRow}><span>Thanh toán</span><MoneyInput label="Số tiền nhà cung cấp trả" invalid={over} value={amount} onChange={setAmount} /></div>
    <div className={styles.methods} role="radiogroup" aria-label="Phương thức">{(["Cash", "BankTransfer"] as const).map((key) => <label key={key}><input type="radio" className="sr-only" name="refund-method" checked={method === key} onChange={() => setMethod(key)} />{methodLabel[key]}</label>)}</div>
    {method === "BankTransfer" && <label className={styles.field}>Mã giao dịch ngân hàng *<input maxLength={100} value={bankReference} onChange={(event) => setBankReference(event.target.value)} /></label>}
    <div className={`${styles.previewRows} mt-3`}><div><span>Nhà cung cấp cần trả</span><strong>{fmt(due)}</strong></div><div className={styles.strong}><span>Tiền nhà cung cấp trả</span><span>{fmt(amount)}</span></div></div>
    {over && <p role="alert" className={styles.warning}>Số tiền không được vượt giá trị phiếu trả.</p>}
    <div className={styles.dialogFoot}><Button className="w-auto" variant="secondary" onClick={onClose}>Bỏ qua</Button><Button className="w-auto" disabled={over || missingReference} onClick={() => onSave({ amount, method, bankReference: method === "BankTransfer" ? bankReference.trim() : "" })}>Xong</Button></div>
  </div></Dialog>;
}
