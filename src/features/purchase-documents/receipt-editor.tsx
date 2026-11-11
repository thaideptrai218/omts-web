"use client";
import { useToast } from "@/components/ui/toast-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { DiscountInput } from "@/components/ui/management-screen/discount-input";
import { PersonPicker } from "@/components/ui/management-screen/person-picker";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { EditorFrame, ItemFinder, MoneyInput, OverflowMenu, QuantityStepper, QuickSupplierDialog, SideRow, SupplierPicker, errorText, fmt, nowLocal, usePurchaseAccess, vnLocal } from "./document-parts";
import { itemHref } from "./receipt-detail";
import { PriceSetupDialog } from "./price-setup-dialog";
import { UnitCell } from "./unit-cell";
import { getReceipt, getReceiptCopy, removeReceipts, saveReceipt, usePurchaseLookups } from "./repository";
import { RECEIPT, baseUnitOf, goodsTotal, lineAmount, receiptStatusLabel, unitChoices, type ItemOption, type Receipt } from "./types";
import styles from "./purchases.module.css";

/**
 * `floor` is what a completed line already gave away (seeded + returned) in base units: the quantity, times the unit's factor, cannot go
 * below it and the line cannot be removed. `itemUnitId` is the unit the quantity and price are typed in.
 */
type Line = { key: string; lineId: string | null; item: ItemOption; itemUnitId: string | null; unitName: string; unitFactor: number; quantity: string; unitPrice: number | null; discount: number; supplierLotCode: string; floor: number };
type Start = { receipt?: Receipt; copy?: { code: string; leftEmpty: string[]; supplierId: string; discount: number; notes: string; lines: { itemId: string; unitPrice: number | null; discount: number }[] } };
const LIST = "/operations/purchase-receipts";
const quantityOf = (value: string) => { const parsed = Number(value.replace(",", ".")); return value && parsed > 0 ? parsed : null; };
/** A new line of an item starts in its base unit. */
const newLine = (item: ItemOption, patch: Partial<Line> = {}): Line => {
  const base = baseUnitOf(item);
  return { key: crypto.randomUUID(), lineId: null, item, itemUnitId: base?.id ?? null, unitName: base?.name ?? item.unit, unitFactor: base?.factor ?? 1, quantity: "1", unitPrice: null, discount: 0, supplierLotCode: "", floor: 0, ...patch };
};
const belowFloor = (line: Line) => (quantityOf(line.quantity) ?? 0) * line.unitFactor < line.floor - 1e-9;

/**
 * Create a receipt, continue a draft, edit a completed receipt, or start from a copy: one page, the source decides the starting values.
 * `itemId` (from the catalogue's Nhập hàng) starts a new receipt with one line of that item.
 */
export function ReceiptEditorPage({ id, copyFrom, itemId }: { id?: string; copyFrom?: string; itemId?: string }) {
  const remote = useRemote<Start>(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<Start>> => {
    if (id) { const result = await getReceipt(id, signal); return result.status === "success" ? { status: "success", data: { receipt: result.data } } : result; }
    if (!copyFrom) return { status: "success", data: {} };
    const result = await getReceiptCopy(copyFrom, signal);
    if (result.status !== "success") return result;
    const r = result.data.receipt;
    return { status: "success", data: { copy: { code: result.data.copiedFromCode, leftEmpty: result.data.leftEmpty, supplierId: r.supplierId ?? "", discount: r.discount ?? 0, notes: r.notes ?? "",
      lines: (r.lines ?? []).filter((line) => line.itemId).map((line) => ({ itemId: line.itemId!, unitPrice: line.unitPrice ?? null, discount: line.discount ?? 0 })) } } };
  }, [id, copyFrom]));
  const lookups = usePurchaseLookups();
  if (remote.loading || lookups.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được phiếu."} onRetry={remote.reload} retryLabel="Tải lại phiếu" />;
  if (remote.data.receipt?.statusId === RECEIPT.cancelled) return <ListStateMessage>Phiếu {remote.data.receipt.code} đã hủy nên không sửa được.</ListStateMessage>;
  return <Editor start={remote.data} lookups={lookups} itemId={itemId} />;
}

function Editor({ start, lookups, itemId }: { start: Start; lookups: ReturnType<typeof usePurchaseLookups>; itemId?: string }) {
  const access = usePurchaseAccess(), router = useRouter(), confirmation = useActionDialog(), { notify } = useToast();
  const { receipt, copy } = start, completed = receipt?.statusId === RECEIPT.completed;
  const [pricing, setPricing] = useState(false);
  const [lines, setLines] = useState<Line[]>(() => receipt ? receipt.lines.map((line) => ({ key: line.id, lineId: line.id, item: lookups.items.find((row) => row.id === line.item.id) ?? line.item, itemUnitId: line.itemUnitId, unitName: line.item.unit, unitFactor: line.unitFactor, quantity: line.quantity == null ? "" : String(line.quantity), unitPrice: line.unitPrice, discount: line.discount, supplierLotCode: line.supplierLotCode ?? "", floor: line.seeded + line.returned }))
    : copy ? copy.lines.flatMap((line) => { const item = lookups.items.find((row) => row.id === line.itemId); return item ? [newLine(item, { quantity: "", unitPrice: line.unitPrice, discount: line.discount })] : []; })
    : (() => { const item = itemId ? lookups.items.find((row) => row.id === itemId) : undefined; return item ? [newLine(item)] : []; })());
  const [receivedAt, setReceivedAt] = useState(receipt ? vnLocal(receipt.receivedAt) : nowLocal()), [receivedById, setReceivedById] = useState(receipt?.receivedBy?.id ?? "");
  const [code, setCode] = useState(receipt?.code ?? "");
  const [supplierId, setSupplierId] = useState(receipt?.supplier.id ?? copy?.supplierId ?? ""), [discount, setDiscount] = useState(receipt?.discount ?? copy?.discount ?? 0), [notes, setNotes] = useState(receipt?.notes ?? copy?.notes ?? "");
  const [error, setError] = useState<string>(), [pending, setPending] = useState(false), [addingSupplier, setAddingSupplier] = useState(false);
  const priced = lines.map((line) => ({ quantity: quantityOf(line.quantity), unitPrice: line.unitPrice, discount: line.discount }));
  const total = goodsTotal(priced), payable = total - discount;
  const suppliers = receipt && !lookups.suppliers.some((row) => row.id === receipt.supplier.id) ? [receipt.supplier, ...lookups.suppliers] : lookups.suppliers;
  const receivers = receipt?.receivedBy && !lookups.receivers.some((row) => row.id === receipt.receivedBy!.id) ? [receipt.receivedBy, ...lookups.receivers] : lookups.receivers;
  const update = (key: string, patch: Partial<Line>) => setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  const add = (item: ItemOption) => setLines((current) => [...current, newLine(item)]);
  const pickUnit = (line: Line, unitId: string) => { const unit = unitChoices(line.item, { itemUnitId: line.itemUnitId, unit: line.unitName, unitFactor: line.unitFactor }).find((row) => row.id === unitId); if (unit) update(line.key, { itemUnitId: unit.id, unitName: unit.name, unitFactor: unit.factor }); };

  async function save(complete: boolean) {
    if (!supplierId) { setError("Chọn nhà cung cấp."); return; }
    const short = lines.find(belowFloor);
    if (short) { setError(`${short.item.name}: số lượng không được nhỏ hơn ${fmt(short.floor / short.unitFactor)} ${short.unitName} (đã gieo và đã trả).`); return; }
    if (lines.some((line) => line.unitPrice != null && line.discount > line.unitPrice)) { setError("Giảm giá trên dòng không được lớn hơn đơn giá."); return; }
    if (complete || completed) {
      if (!lines.length || lines.some((line) => !quantityOf(line.quantity) || line.unitPrice == null)) { setError("Mỗi dòng hàng cần có số lượng và đơn giá."); return; }
      if (discount > total) { setError("Giảm giá không được lớn hơn tổng tiền hàng."); return; }
    }
    if (completed && receipt) {
      const change = payable - receipt.payable;
      const effect = change > 0 ? `Hợp tác xã nợ ${receipt.supplier.name} thêm ${fmt(change)} đ.` : change < 0 ? `${receipt.supplier.name} nợ lại hợp tác xã ${fmt(-change)} đ (công nợ giảm).` : "Công nợ không đổi.";
      if (!(await confirmation.confirm(`Lưu thay đổi phiếu ${receipt.code}? ${effect}`))) return;
    } else if (complete && !(await confirmation.confirm(`Hoàn thành phiếu nhập? Công nợ tăng ${fmt(payable)} đ cho nhà cung cấp.`))) return;
    setPending(true); setError(undefined);
    const result = await saveReceipt({ id: receipt?.id, rowVersion: receipt?.rowVersion, code, receivedAt, receivedById, supplierId, discount, notes,
      lines: lines.map((line) => ({ lineId: completed ? line.lineId : null, itemId: line.item.id, itemUnitId: line.itemUnitId, quantity: quantityOf(line.quantity), unitPrice: line.unitPrice, discount: line.discount, supplierLotCode: line.item.group === "Seed" ? line.supplierLotCode : "" })) }, complete);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã lưu phiếu nhập ${result.data.code}.` }); router.push(`${LIST}?code=${result.data.code}`); } else setError(errorText(result));
  }
  async function remove() {
    if (!receipt || !(await confirmation.confirm(`Xóa phiếu tạm ${receipt.code}?`))) return;
    const result = await removeReceipts([receipt.id]);
    if (result.status === "success" && result.data) { notify({ tone: "success", title: `Đã xóa phiếu tạm ${receipt.code}.` }); router.push(LIST); } else setError(errorText(result) ?? "Không xóa được phiếu tạm.");
  }

  return <EditorFrame title={completed ? `Sửa phiếu nhập ${receipt!.code}` : receipt ? `Phiếu tạm ${receipt.code}` : "Nhập hàng"} backHref={LIST}
    source={copy ? `Sao chép từ phiếu ${copy.code}; nhập lại số lượng.${copy.leftEmpty.length ? ` Đã bỏ trống vì không còn sử dụng: ${copy.leftEmpty.join(", ")}.` : ""}` : completed ? "Sửa số lượng, giá hoặc giảm giá: công nợ nhà cung cấp thay đổi đúng bằng phần chênh lệch." : undefined}
    tools={<><ItemFinder placeholder="Tìm hàng hóa theo mã hoặc tên" items={lookups.items} onPick={add} />{receipt && access.owner && receipt.statusId !== RECEIPT.cancelled && <Button className="ml-auto w-auto" variant="secondary" onClick={() => setPricing(true)}>Thiết lập giá</Button>}{receipt?.statusId === RECEIPT.draft && access.remove && <OverflowMenu actionLabel="Xóa phiếu tạm" onAction={() => void remove()} />}</>}>
    {confirmation.dialog}
    <div className={styles.editorBody}>
      <div className={styles.linesPanel}>
        <table className={styles.lines}><thead><tr><th className={styles.narrow} /><th className={styles.narrow}>STT</th><th>Mã hàng</th><th>Tên hàng</th><th>ĐVT</th><th className={styles.num}>Số lượng</th><th className={styles.num}>Đơn giá</th><th className={styles.num}>Giảm giá</th><th className={styles.num}>Thành tiền</th></tr></thead>
          <tbody>{lines.map((line, index) => <tr key={line.key}>
            <td className={styles.narrow}>{line.floor > 0 ? null : <button type="button" className={styles.remove} aria-label={`Bỏ dòng ${index + 1}`} title="Bỏ dòng" onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}><InterfaceIcon name="trash" /></button>}</td>
            <td className={styles.narrow}>{index + 1}</td>
            <td><Link className={styles.code} href={itemHref(line.item.code)} target="_blank">{line.item.code}</Link></td>
            <td>{line.item.name}{line.item.group === "Seed" && <input aria-label={`Mã lô của nhà cung cấp dòng ${index + 1}`} className={styles.lotInput} maxLength={50} placeholder="Mã lô của nhà cung cấp..." value={line.supplierLotCode} onChange={(event) => update(line.key, { supplierLotCode: event.target.value })} />}</td>
            <td><UnitCell line={line} index={index} onPick={(unitId) => pickUnit(line, unitId)} /></td>
            <td className={styles.num}><QuantityStepper label={`số lượng dòng ${index + 1}`} value={line.quantity} invalid={belowFloor(line)} onChange={(quantity) => update(line.key, { quantity })} />{line.floor > 0 && <span className={styles.cap}>tối thiểu {fmt(line.floor / line.unitFactor)}</span>}</td>
            <td><MoneyInput label={`Đơn giá dòng ${index + 1}`} className={styles.cellInput} value={line.unitPrice} onChange={(unitPrice) => update(line.key, { unitPrice })} /></td>
            <td><DiscountInput compact label={`Giảm giá dòng ${index + 1}`} base={line.unitPrice ?? 0} invalid={line.unitPrice != null && line.discount > line.unitPrice} value={line.discount} onChange={(value) => update(line.key, { discount: value })} /></td>
            <td className={styles.amount}>{fmt(lineAmount(priced[index]))}</td>
          </tr>)}</tbody></table>
        {!lines.length && <div className={styles.emptyLines}><InterfaceIcon name="material" /><strong>Chưa có hàng trong phiếu</strong><span>Tìm hàng theo mã hoặc tên ở ô phía trên để thêm dòng.</span></div>}
      </div>
      <aside className={styles.side} aria-label="Thông tin phiếu nhập">
        <div className={styles.sideScroll}>
          <div className={styles.sideTop}>
            <PersonPicker label="Người nhập" people={receivers} value={receivedById} placeholder={`${access.username} (người lập)`} onChange={setReceivedById} />
            <DatePickerField label="Ngày nhập" withTime value={receivedAt} max={nowLocal()} onChange={setReceivedAt} />
          </div>
          <SupplierPicker suppliers={suppliers} value={supplierId} locked={completed} onChange={setSupplierId} onAdd={access.addSupplier && !completed ? () => setAddingSupplier(true) : undefined} />
          <SideRow label="Mã phiếu nhập"><input aria-label="Mã phiếu nhập" readOnly={completed} maxLength={30} placeholder="Mã phiếu tự động" title={completed ? "Phiếu đã nhập hàng giữ nguyên mã vì mã lô giống in theo mã phiếu" : "Để trống để hệ thống tự cấp mã"} value={code} onChange={(event) => setCode(event.target.value.replace(/\s/g, ""))} /></SideRow>
          <SideRow label="Trạng thái">{receiptStatusLabel[receipt?.statusId ?? RECEIPT.draft]}</SideRow>
          <div className={styles.divider} />
          <SideRow label={`Tổng tiền hàng (${lines.length})`}>{fmt(total)}</SideRow>
          <SideRow label="Giảm giá"><DiscountInput label="Giảm giá phiếu" base={total} value={discount} invalid={discount > total} onChange={setDiscount} /></SideRow>
          <SideRow label="Cần trả nhà cung cấp" strong>{fmt(payable)}</SideRow>
          {completed && receipt && payable !== receipt.payable && <SideRow label="Chênh lệch công nợ">{payable > receipt.payable ? "+" : "−"}{fmt(Math.abs(payable - receipt.payable))}</SideRow>}
          <textarea className={styles.sideNote} aria-label="Ghi chú" placeholder="Ghi chú" maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          <ErrorNotice error={error} />
        </div>
        <div className={styles.sideActions} style={completed ? { gridTemplateColumns: "1fr" } : undefined}>
          {completed ? <Button disabled={pending} onClick={() => void save(false)}>Lưu</Button>
            : <><Button variant="secondary" disabled={pending} onClick={() => void save(false)}>Lưu tạm</Button><Button disabled={pending} onClick={() => void save(true)}>Hoàn thành</Button></>}
        </div>
      </aside>
    </div>
    {pricing && receipt && <PriceSetupDialog receiptId={receipt.id} receiptCode={receipt.code} onClose={() => setPricing(false)} />}
    {addingSupplier && <QuickSupplierDialog onClose={() => setAddingSupplier(false)} onSaved={(supplier) => { lookups.refresh(); setSupplierId(supplier.id); setAddingSupplier(false); }} />}
  </EditorFrame>;
}
