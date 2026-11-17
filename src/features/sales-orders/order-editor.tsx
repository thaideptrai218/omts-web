"use client";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { DiscountInput } from "@/components/ui/management-screen/discount-input";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { PersonPicker } from "@/components/ui/management-screen/person-picker";
import { SelectBox } from "@/components/ui/select-box";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useToast } from "@/components/ui/toast-provider";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { PAYMENT } from "@/features/customers/contracts";
import { CustomerQrDialog, type QrShown } from "@/features/customers/customer-qr-dialog";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { EditorFrame, ItemFinder, SideRow, fmt, nowLocal, vnLocal } from "@/features/purchase-documents/document-parts";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import { listReceivers } from "@/features/purchase-documents/repository";
import type { ItemOption } from "@/features/purchase-documents/types";
import type { InvoiceConfirmation } from "@/features/sales-invoices/confirmation-problem";
import { IN_USE, type ProductRow } from "@/features/products/contracts";
import { productRepository } from "@/features/products/repository";
import { ORDER, orderSources, type OrderSource, type OrderView, type RequestDraft } from "./contracts";
import { useOrderAccess, type OrderAccess } from "./order-access";
import { OrderAdvanceFields } from "./order-advance-fields";
import { OrderCustomerPicker, type OrderCustomer } from "./order-customer-picker";
import { OrderQuestionDialog, type OrderQuestion } from "./order-dialogs";
import { ORDERS_PATH, orderHref, orderSourceOptions, orderStatusLabel } from "./order-labels";
import { OrderLinesTable, type EditorLine, type LineUnit } from "./order-lines-table";
import { buildOrderBody, defaultPrice, orderTotals, parseQuantity, validateForm, withAnswer, type Advance, type Decisions, type OrderForm } from "./order-logic";
import { errorText, orderRepository, problemText } from "./repository";

type Start = { order?: OrderView; copy?: OrderView; draft?: RequestDraft };
const INVOICE_CANCELLED = 3502;
const noAdvance: Advance = { amount: 0, method: "Cash", bankReference: "", cashAccountId: "" };

const optionOf = (product: ProductRow): ItemOption => ({ id: product.id, code: product.code, name: product.name, unit: "kg", group: "Other", units: [] });
const unitsOf = (product: ProductRow): LineUnit[] => product.units.map((unit) => ({ id: unit.unitId, name: unit.name, factor: unit.factor, salePrice: defaultPrice(unit, product.unitPrice) }));
const baseUnit = (product: ProductRow) => product.units.find((unit) => unit.isBase) ?? product.units[0];

type Source = { productId: string; productCode: string; productName: string; unitId: string; unitName: string; factor: number; quantity: number | null; unitPrice: number | null; listPrice: number | null; note?: string | null; delivered?: number };
/** A line of the form: the units come from the catalogue when the product is still in use there, otherwise just the unit the source line already had. */
function lineOf(source: Source, products: readonly ProductRow[]): EditorLine {
  const product = products.find((row) => row.id === source.productId);
  const units = product ? unitsOf(product) : [];
  if (!units.some((unit) => unit.id === source.unitId)) units.push({ id: source.unitId, name: source.unitName, factor: source.factor, salePrice: source.listPrice });
  return {
    key: crypto.randomUUID(), productId: source.productId, productCode: source.productCode, productName: source.productName, units, unitId: source.unitId,
    quantity: source.quantity == null ? "" : String(source.quantity), unitPrice: source.unitPrice, listPrice: source.listPrice ?? units.find((unit) => unit.id === source.unitId)?.salePrice ?? null,
    note: source.note ?? "", delivered: source.delivered ?? 0,
  };
}

/**
 * Create an order, change an open one, or start from a copy or from a purchase request (`request`, Owner): one page, the source decides the starting values.
 * The advance ("Khách thanh toán") is taken with the order when it is created, and one more can be taken whenever an open order is opened again.
 */
export function OrderEditorPage({ id, copyFrom, requestId }: { id?: string; copyFrom?: string; requestId?: string }) {
  const access = useOrderAccess(), source = id ?? copyFrom;
  const remote = useRemote<Start>(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<Start>> => {
    if (source) { const result = await orderRepository.detail(source, signal); return result.status === "success" ? { status: "success", data: id ? { order: result.data } : { copy: result.data } } : result; }
    if (requestId) { const result = await orderRepository.requestDraft(requestId, signal); return result.status === "success" ? { status: "success", data: { draft: result.data } } : result; }
    return { status: "success", data: {} };
  }, [source, id, requestId]));
  const products = useRemote<ProductRow[]>(useCallback((signal: AbortSignal) => productRepository.all({}, signal), []));
  const people = useRemote(useCallback((signal: AbortSignal) => listReceivers(signal), []));
  if (!(id ? access.edit : access.create)) return <ListStateMessage>Bạn không có quyền lập hoặc sửa đơn đặt hàng.</ListStateMessage>;
  if (remote.loading || products.loading || people.loading) return <Skeleton />;
  const failure = remote.error ?? products.error;
  if (failure || !remote.data || !products.data) return <ListStateMessage error={failure ?? "Không tải được dữ liệu."} onRetry={() => { remote.reload(); products.reload(); }} retryLabel="Tải lại" />;
  const { order } = remote.data;
  if (id && order && (!order.allowedActions.includes("Edit") || order.statusId !== ORDER.draft && order.statusId !== ORDER.delivering)) return <ListStateMessage>Đơn {order.code} ở trạng thái {orderStatusLabel[order.statusId]} nên không sửa được.</ListStateMessage>;
  return <Editor access={access} start={remote.data} products={products.data} people={people.data ?? []} />;
}

function Editor({ access, start, products, people }: { access: OrderAccess; start: Start; products: ProductRow[]; people: { id: string; name: string }[] }) {
  const router = useRouter(), { notify } = useToast();
  const { order, copy, draft } = start, origin = order ?? copy;
  const lockedCustomer = !!order && (order.invoices.some((invoice) => invoice.statusId !== INVOICE_CANCELLED) || order.advances.length > 0);
  const [lines, setLines] = useState<EditorLine[]>(() => order ? order.lines.map((line) => lineOf({ ...line, quantity: line.quantity, delivered: line.deliveredQuantity }, products))
    : copy ? copy.lines.map((line) => lineOf({ ...line, unitPrice: null, listPrice: null }, products)).map((line) => ({ ...line, unitPrice: line.listPrice }))
    : draft ? draft.lines.map((line) => lineOf({ ...line, factor: 1, listPrice: line.unitPrice }, products)) : []);
  const [customer, setCustomer] = useState<OrderCustomer | null>(() => origin?.customer ? { id: origin.customer.id, code: origin.customer.code, name: origin.customer.name, phone: origin.customer.phoneNumber ?? "" }
    : draft ? { id: draft.customer.id, code: draft.customer.code, name: draft.customer.name, phone: draft.customer.phoneNumber ?? "" } : null);
  const [walkIn, setWalkIn] = useState(origin?.walkInCustomer ?? false);
  const [code, setCode] = useState(order?.code ?? "");
  const [orderedAt, setOrderedAt] = useState(order ? vnLocal(order.orderedAt) : nowLocal());
  const [pickupAt, setPickupAt] = useState(order?.pickupAt ? vnLocal(order.pickupAt) : draft ? vnLocal(draft.pickupAt) : "");
  const [source, setSource] = useState<OrderSource>(access.owner ? draft?.source ?? origin?.source ?? "Phone" : order?.source ?? "AtPort");
  const [receivedById, setReceivedById] = useState(order?.receivedBy.id ?? "");
  const [note, setNote] = useState(order?.note ?? draft?.note ?? copy?.note ?? "");
  const [discount, setDiscount] = useState(order?.discount ?? copy?.discount ?? 0);
  const [advance, setAdvance] = useState<Advance>(noAdvance);
  const [error, setError] = useState<string>(), [pending, setPending] = useState(false), [question, setQuestion] = useState<OrderQuestion>();
  const [qr, setQr] = useState<{ shown: QrShown; code: string }>(), [reprint, setReprint] = useState<string>(), [key] = useState(() => crypto.randomUUID());
  const finderItems = useMemo<ItemOption[]>(() => products.filter((product) => product.statusId === IN_USE).map(optionOf), [products]);
  const totals = orderTotals(lines.map((line) => ({ quantity: parseQuantity(line.quantity), unitPrice: line.unitPrice })), discount);
  const sourceLocked = !!draft || !access.owner;
  /** Advances of this order whose VietQR is still waiting for the transfer: their code can be shown again. */
  const waitingQr = order ? order.advances.filter((row) => row.statusId === PAYMENT.pending) : [];
  // What is already taken with the order (a cancelled payment does not count) leaves the room for one more advance.
  const advanced = order ? order.advances.filter((row) => row.statusId !== PAYMENT.cancelled).reduce((sum, row) => sum + row.amount, 0) : 0, room = Math.max(0, totals.total - advanced);
  const canAdvance = !walkIn && !!customer && (!order || order.allowedActions.includes("AddAdvance"));

  const update = (lineKey: string, patch: Partial<EditorLine>) => { setLines((current) => current.map((line) => line.key === lineKey ? { ...line, ...patch } : line)); setError(undefined); };
  function add(option: ItemOption) {
    const product = products.find((row) => row.id === option.id), unit = product && baseUnit(product);
    if (!product || !unit) return;
    const price = defaultPrice(unit, product.unitPrice);
    setLines((current) => [...current, { key: crypto.randomUUID(), productId: product.id, productCode: product.code, productName: product.name, units: unitsOf(product), unitId: unit.unitId, quantity: "1", unitPrice: price, listPrice: price, note: "", delivered: 0 }]);
    setError(undefined);
  }
  const ask = (confirmation: InvoiceConfirmation) =>
    new Promise<"yes" | "cancel">((resolve) => setQuestion({ confirmation, reply: (answer) => { setQuestion(undefined); resolve(answer); } }));

  function formValues(): OrderForm {
    return {
      code, customerId: customer?.id ?? "", walkIn, purchaseRequestId: draft?.purchaseRequestId, source, receivedById, orderedAt, pickupAt, note, discount,
      lines: lines.map((line) => ({ productId: line.productId, unitId: line.unitId, quantity: line.quantity, unitPrice: line.unitPrice, listPrice: line.listPrice, note: line.note })),
      advance: canAdvance ? advance : undefined, deduplicationKey: key, rowVersion: order?.rowVersion,
    };
  }
  async function save(print: boolean, decisions: Decisions = { lines: new Set(), discount: false }): Promise<void> {
    if (pending) return;
    const form = formValues();
    const problem = validateForm(form, room) ?? lines.map((line, index) => (parseQuantity(line.quantity) ?? 0) < line.delivered ? `Dòng ${index + 1}: số lượng không được nhỏ hơn số đã giao (${fmt(line.delivered)}).` : undefined).find(Boolean);
    if (problem) { setError(problem); return; }
    setPending(true); setError(undefined);
    const body = buildOrderBody(form, decisions);
    const result = order ? await orderRepository.update(order.id, body) : await orderRepository.create(body);
    if (result.status !== "success") {
      setPending(false);
      if (result.confirmation) {
        if (await ask(result.confirmation) === "yes") await save(print, withAnswer(decisions, result.confirmation.field));
        return;
      }
      setError(problemText(result));
      return;
    }
    const saved = result.data.order, qrPayment = saved.advances.filter((row) => row.statusId === PAYMENT.pending).at(-1);
    if (print) { const printed = await orderRepository.print(saved.id); if (printed.status !== "success") notify({ tone: "danger", title: errorText(printed) ?? "Không in được đơn đặt hàng." }); }
    setPending(false);
    notify({ tone: "success", title: order ? `Đã lưu đơn đặt hàng ${saved.code}.` : `Đã đặt hàng ${saved.code}.` });
    if (result.data.advanceQr && qrPayment) setQr({ shown: { payment: { id: qrPayment.paymentId, code: qrPayment.paymentCode }, qr: result.data.advanceQr }, code: saved.code });
    else router.push(orderHref(saved.code));
  }

  const title = order ? `Sửa đơn đặt hàng ${order.code}` : copy ? `Sao chép ${copy.code}` : "Đặt hàng";
  const sourceNote = draft ? `Tạo từ yêu cầu mua của ${draft.customer.name}; kiểm tra lại số lượng, đơn giá và hẹn lấy hàng.` : copy ? `Sao chép từ đơn ${copy.code}; kiểm tra lại số lượng và đơn giá.` : undefined;
  return <EditorFrame title={title} backHref={ORDERS_PATH} source={sourceNote} tools={<ItemFinder placeholder="Tìm hàng hóa theo mã hoặc tên" items={finderItems} onPick={add} />}>
    {question && <OrderQuestionDialog question={question} />}
    {qr && <CustomerQrDialog shown={qr.shown} onClose={() => router.push(orderHref(qr.code))} />}
    {reprint && <CustomerQrDialog reprintId={reprint} onClose={() => setReprint(undefined)} />}
    <div className={purchaseStyles.editorBody}>
      <div className={purchaseStyles.linesPanel}>
        <OrderLinesTable lines={lines} onChange={update} onRemove={(lineKey) => setLines((current) => current.filter((line) => line.key !== lineKey))} />
        {!lines.length && <div className={purchaseStyles.emptyLines}><InterfaceIcon name="product" /><strong>Chưa có hàng trong đơn</strong><span>Tìm hàng theo mã hoặc tên ở ô phía trên để thêm dòng.</span></div>}
      </div>
      <aside className={purchaseStyles.side} aria-label="Thông tin đơn đặt hàng">
        <div className={purchaseStyles.sideScroll}>
          <div className={purchaseStyles.sideTop}>
            <PersonPicker label="Người nhận đặt" people={people} value={receivedById} placeholder={`${access.username} (người lập)`} onChange={setReceivedById} />
            <DatePickerField label="Thời gian" withTime value={orderedAt} max={nowLocal()} onChange={setOrderedAt} />
          </div>
          <OrderCustomerPicker customer={customer} walkIn={walkIn} locked={lockedCustomer} canAdd={access.addCustomer} onPick={(next) => { setCustomer(next); setWalkIn(false); if (!next) setAdvance(noAdvance); }} onWalkIn={() => { setWalkIn(true); setCustomer(null); setAdvance(noAdvance); }} />
          <SideRow label="Mã đặt hàng"><input aria-label="Mã đặt hàng" maxLength={30} placeholder="Mã đơn tự động" title="Để trống để hệ thống tự cấp mã" value={code} onChange={(event) => setCode(event.target.value.replace(/\s/g, ""))} /></SideRow>
          <SideRow label="Hẹn lấy hàng"><DatePickerField label="Hẹn lấy hàng" withTime value={pickupAt} onChange={setPickupAt} /></SideRow>
          <SideRow label="Nguồn đặt"><SelectBox aria-label="Nguồn đặt" value={source} disabled={sourceLocked} onChange={(event) => setSource(event.target.value as OrderSource)}>
            {orderSourceOptions.filter(([value]) => orderSources.includes(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectBox></SideRow>
          <SideRow label="Trạng thái">{orderStatusLabel[order?.statusId ?? ORDER.draft]}</SideRow>
          <div className={purchaseStyles.divider} />
          <SideRow label={`Tổng tiền hàng (${lines.length})`}>{fmt(totals.subtotal)}</SideRow>
          <SideRow label="Giảm giá"><DiscountInput label="Giảm giá đơn" base={totals.subtotal} value={discount} invalid={discount > totals.subtotal} onChange={setDiscount} /></SideRow>
          <SideRow label="Khách cần trả" strong>{fmt(totals.total)}</SideRow>
          {order && advanced > 0 && <SideRow label="Khách đã ứng">{fmt(advanced)}</SideRow>}
          {waitingQr.map((row) => <SideRow key={row.paymentId} label={row.paymentCode}><button type="button" className={purchaseStyles.refundLink} onClick={() => setReprint(row.paymentId)}><InterfaceIcon name="payment" />Hiện mã QR</button></SideRow>)}
          {canAdvance && <OrderAdvanceFields value={advance} total={room} disabled={pending} onChange={setAdvance} />}
          <textarea className={purchaseStyles.sideNote} aria-label="Ghi chú" placeholder="Ghi chú" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
          <ErrorNotice error={error} />
        </div>
        <div className={purchaseStyles.sideActions}>
          <Button variant="secondary" disabled={pending} onClick={() => void save(true)}>In</Button>
          <Button disabled={pending} onClick={() => void save(false)}>{order ? "Lưu" : "Đặt hàng"}</Button>
        </div>
      </aside>
    </div>
  </EditorFrame>;
}
