"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { DiscountInput } from "@/components/ui/management-screen/discount-input";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { customerHref, invoiceHref } from "@/features/customers/customer-links";
import { useKgPerCage } from "@/features/harvest-settings-lookup/use-kg-per-cage";
import { operationAllowed } from "@/features/operations/permissions";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { IN_USE, type ProductRow } from "@/features/products/contracts";
import { productRepository } from "@/features/products/repository";
import { EditorFrame, ItemFinder, MoneyInput, SideRow, fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import type { ItemOption } from "@/features/purchase-documents/types";
import { ORDER, type OrderView } from "@/features/sales-orders/contracts";
import { ORDERS_PATH, orderHref } from "@/features/sales-orders/order-labels";
import { defaultPrice } from "@/features/sales-orders/order-logic";
import { errorText, orderRepository } from "@/features/sales-orders/repository";
import type { LotForSale, SalesInvoice, salesInvoiceSaved } from "@/features/sales-invoices/contracts";
import { InvoiceFinishPanel } from "@/features/sales-invoices/invoice-finish-panel";
import { InvoiceQuestionDialog } from "@/features/sales-invoices/invoice-question-dialog";
import { VietQrDialog } from "@/features/sales-invoices/vietqr-dialog";
import { VietQrResumeNotice } from "@/features/sales-invoices/vietqr-resume-notice";
import { isPendingSale, type PendingSale } from "@/features/sales-invoices/vietqr-contracts";
import type { z } from "zod";
import type { InvoiceDraft } from "./contracts";
import { FinishOrderDialog } from "./finish-order-dialog";
import { InvoiceEditorLines } from "./invoice-editor-lines";
import { buildCreateBody, buildUpdateBody, discountShare, firstProblem, invoiceTotals, lineFromDraft, type EditorLine, type EditorUnit, type Form, type PaymentMode } from "./invoice-editor-logic";
import { invoiceEditorRepository as repository } from "./repository";
import { useInvoiceSubmit } from "./use-invoice-submit";

type Start = { kind: "new"; draft: InvoiceDraft; lots: LotForSale[] } | { kind: "edit"; invoice: SalesInvoice; order: OrderView | null; lots: LotForSale[] };
type Saved = z.infer<typeof salesInvoiceSaved>;
const CANCELLED = 3502, PAYMENT_CANCELLED = 3603;

const unitsOf = (product: ProductRow | undefined): EditorUnit[] => (product?.units ?? []).map((unit) => ({ id: unit.unitId, name: unit.name, factor: unit.factor, salePrice: defaultPrice(unit, product?.unitPrice) }));
const optionOf = (product: ProductRow): ItemOption => ({ id: product.id, code: product.code, name: product.name, unit: "kg", group: "Other", units: [] });

/**
 * The invoice editor: a new invoice made from an order (`orderId`, from "Xử lý đặt hàng") or an existing invoice changed the way a receipt is (`invoiceId`).
 * One page; the source decides the starting values.
 */
export function InvoiceEditorPage({ orderId, invoiceId }: { orderId?: string; invoiceId?: string }) {
  const { identity, permissions } = useApiWorkspace();
  const remote = useRemote<Start>(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<Start>> => {
    if (invoiceId) {
      const result = await repository.invoice(invoiceId, signal);
      if (result.status !== "success") return result;
      // The order gives what was ordered and delivered per line; an old invoice has none, and an order that cannot be read only hides those columns.
      const orderRef = result.data.salesOrder?.id;
      const [order, lots] = await Promise.all([orderRef ? orderRepository.detail(orderRef, signal) : undefined, repository.lots(orderRef, signal)]);
      if (lots.status !== "success") return lots;
      return { status: "success", data: { kind: "edit", invoice: result.data, order: order?.status === "success" ? order.data : null, lots: lots.data.lots } };
    }
    if (!orderId) return { status: "error", httpStatus: 400, uncertain: false };
    const [draft, lots] = await Promise.all([repository.draft(orderId, signal), repository.lots(orderId, signal)]);
    if (draft.status !== "success") return draft;
    return lots.status === "success" ? { status: "success", data: { kind: "new", draft: draft.data, lots: lots.data.lots } } : lots;
  }, [invoiceId, orderId]));
  const products = useRemote<ProductRow[]>(useCallback((signal: AbortSignal) => productRepository.all({}, signal), []));
  if (!operationAllowed("sales-invoices", identity, permissions.functionPermissions, invoiceId ? "Edit" : "Create")) return <ListStateMessage>Bạn không có quyền {invoiceId ? "sửa hóa đơn bán" : "lập hóa đơn bán"}.</ListStateMessage>;
  if (remote.loading || products.loading) return <Skeleton />;
  const failure = remote.error ?? products.error;
  if (failure || !remote.data || !products.data) return <ListStateMessage error={failure ?? "Không tải được dữ liệu."} onRetry={() => { remote.reload(); products.reload(); }} retryLabel="Tải lại" />;
  const start = remote.data;
  if (start.kind === "edit" && start.invoice.statusId === CANCELLED) return <ListStateMessage>Hóa đơn {start.invoice.code} đã hủy nên không sửa được.</ListStateMessage>;
  if (start.kind === "new" && start.draft.order.statusId !== ORDER.draft && start.draft.order.statusId !== ORDER.delivering) return <ListStateMessage>Đơn đặt hàng {start.draft.order.code} không còn ở trạng thái xử lý được.</ListStateMessage>;
  return <Editor start={start} products={products.data} />;
}

function initialLines(start: Start, products: readonly ProductRow[]): EditorLine[] {
  const productOf = (id: string) => products.find((row) => row.id === id);
  if (start.kind === "new") return start.draft.lines.map((line) => lineFromDraft(line, crypto.randomUUID(), unitsOf(productOf(line.productId))));
  const orderLines = new Map((start.order?.lines ?? []).map((line) => [line.id, line]));
  return start.invoice.lines.map((line) => {
    const product = productOf(line.productId), unit = line.unit, orderLine = line.salesOrderLineId ? orderLines.get(line.salesOrderLineId) : undefined;
    const known = unitsOf(product);
    return {
      key: line.id, lineId: line.id, orderLineId: line.salesOrderLineId ?? null, productId: line.productId, productCode: product?.code ?? "", productName: line.productName,
      units: unit && !known.some((row) => row.id === unit.id) ? [{ id: unit.id, name: unit.name, factor: unit.factor, salePrice: null }, ...known] : known,
      unitId: unit?.id ?? null, unitName: unit?.name ?? "kg", factor: unit?.factor ?? 1, quantity: String(line.quantity ?? line.kg), kg: String(line.kg), lotId: line.harvestLotId, lotCode: line.lotCode,
      // A price already on the invoice is not asked about again; only a price typed now is compared with it.
      unitPrice: line.unitPrice, referencePrice: line.unitPrice, ordered: orderLine?.quantity ?? null, delivered: orderLine?.deliveredQuantity ?? null,
    };
  });
}

function Editor({ start, products }: { start: Start; products: ProductRow[] }) {
  const router = useRouter(), { notify } = useToast(), confirmation = useActionDialog(), { identity } = useApiWorkspace();
  const { kgPerCage } = useKgPerCage(identity.subjectType === "CooperativeOwner" ? identity.accountId : undefined); // Owner-only read: undefined for others, so kg is shown alone.
  const submitter = useInvoiceSubmit();
  const invoice = start.kind === "edit" ? start.invoice : undefined, draft = start.kind === "new" ? start.draft : undefined;
  const customer = draft ? draft.customer ?? null : invoice?.customer ?? null, walkIn = draft ? draft.walkInCustomer : invoice?.walkInCustomer ?? false;
  const zone = draft?.zone ?? invoice?.zone, order = draft?.order ?? (invoice?.salesOrder ?? undefined);
  const lockedCode = !!invoice?.payments.some((payment) => payment.method === "VietQrInvoice" && payment.statusId !== PAYMENT_CANCELLED);

  const [lines, setLines] = useState<EditorLine[]>(() => initialLines(start, products));
  const [code, setCode] = useState(invoice?.code ?? ""), [note, setNote] = useState(invoice?.note ?? ""), [otherCharges, setOtherCharges] = useState(invoice?.otherCharges ?? 0);
  const [discountValue, setDiscountValue] = useState(invoice?.discount ?? 0), [discountTouched, setDiscountTouched] = useState(!!invoice);
  const [cash, setCash] = useState(0), [payLater, setPayLater] = useState(false);
  const [notWholeLots, setNotWholeLots] = useState<ReadonlySet<string>>(() => invoice ? new Set([...new Set(invoice.lines.map((line) => line.harvestLotId))].filter((lot) => invoice.lines.filter((line) => line.harvestLotId === lot).every((line) => !line.soldWholeLot))) : new Set());
  const [error, setError] = useState<string>(), [pending, setPending] = useState<PendingSale>(), [saved, setSaved] = useState<Saved>(), [asking, setAsking] = useState(false);
  const [openedAt] = useState(() => new Date().toISOString());
  const pendingList = useRemote(useCallback((signal: AbortSignal) => draft ? repository.pending(signal) : Promise.resolve<WorkspaceResult<PendingSale[]>>({ status: "success", data: [] }), [draft]));

  const subtotal = invoiceTotals({ lines, discount: 0, otherCharges: 0, advanceLeft: 0, cash: 0 }).subtotal;
  // The share of the order discount follows the goods of this invoice until the seller types another amount.
  const discount = draft && !discountTouched ? discountShare(draft, subtotal) : discountValue;
  const totals = invoiceTotals({ lines, discount, otherCharges, advanceLeft: draft?.advanceLeft ?? 0, cash });
  const form: Form = { lines, code, note, discount, otherCharges, cash, payLater, notWholeLots, walkIn };
  const paid = invoice?.payments.reduce((sum, payment) => payment.statusId === PAYMENT_CANCELLED ? sum : sum + (payment.kind === "PaidBack" ? -payment.amount : payment.amount), 0) ?? 0;
  const locked = submitter.saving || !!pending;

  // Leaving the page half-way would lose what was typed.
  useEffect(() => {
    if (saved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saved]);

  const change = (key: string, next: (line: EditorLine) => EditorLine) => { setLines((current) => current.map((line) => line.key === key ? next(line) : line)); setError(undefined); };
  function pickUnit(key: string, unitId: string) {
    change(key, (line) => {
      const unit = line.units.find((row) => row.id === unitId);
      return unit ? { ...line, unitId: unit.id, unitName: unit.name, factor: unit.factor, unitPrice: unit.salePrice, referencePrice: unit.salePrice, kg: unit.factor === 1 ? line.quantity : line.kg } : line;
    });
  }
  function add(option: ItemOption) {
    const product = products.find((row) => row.id === option.id), unit = product && (product.units.find((row) => row.isBase) ?? product.units[0]);
    if (!product || !unit) return;
    const price = defaultPrice(unit, product.unitPrice);
    setLines((current) => [...current, { key: crypto.randomUUID(), lineId: null, orderLineId: null, productId: product.id, productCode: product.code, productName: product.name, units: unitsOf(product), unitId: unit.unitId, unitName: unit.name, factor: unit.factor,
      quantity: "", kg: "", lotId: "", lotCode: "", unitPrice: price, referencePrice: price, ordered: null, delivered: null }]);
    setError(undefined);
  }

  function afterSaved(result: Saved) {
    notify({ tone: "success", title: `Đã lập hóa đơn ${result.invoice.code}.` });
    setSaved(result); setAsking(!!(result.order?.canFinish ?? result.orderCanFinish));
  }
  async function submit(mode: PaymentMode) {
    const problem = firstProblem(form, totals, { payment: !invoice, mode: invoice ? undefined : mode });
    if (problem) { setError(problem); return; }
    setError(undefined);
    const signature = JSON.stringify([lines, code, note, discount, otherCharges, cash, payLater, [...notWholeLots], mode]);
    if (invoice) {
      const difference = totals.total - invoice.total;
      const effect = difference > 0 ? `Khách nợ thêm ${fmt(difference)} đ.` : difference < 0 ? `Tổng hóa đơn giảm ${fmt(-difference)} đ: công nợ của khách giảm tương ứng.` : "Công nợ không đổi.";
      if (!(await confirmation.confirm(`Lưu thay đổi hóa đơn ${invoice.code}? ${effect}`))) return;
      const out = await submitter.run(signature, (answers) => repository.update(invoice.id, buildUpdateBody(invoice.rowVersion, form, answers, totals)), { verb: "lưu" });
      if (!out) return;
      if (out.status === "stopped") { setError(out.message); return; }
      const savedCode = out.data.invoice.code;
      notify({ tone: "success", title: `Đã lưu hóa đơn ${savedCode}.` });
      router.push(invoiceHref(savedCode));
      return;
    }
    if (!draft) return;
    const out = await submitter.run(signature, (answers, key) => repository.create(buildCreateBody(draft.order.id, form, answers, totals, key, mode)), { vietQr: mode === "vietQr", verb: "lập" });
    if (!out) return;
    if (out.status === "stopped") { setError(out.message); pendingList.reload(); return; }
    if (isPendingSale(out.data)) setPending(out.data); else afterSaved(out.data);
  }
  async function finishOrder(): Promise<string | undefined> {
    if (!draft) return undefined;
    const result = await orderRepository.finish(draft.order.id);
    if (result.status !== "success") return errorText(result) ?? "Chưa kết thúc được đơn đặt hàng.";
    notify({ tone: "success", title: `Đơn đặt hàng ${draft.order.code} đã hoàn thành.` });
    setAsking(false);
    return undefined;
  }
  const backHref = invoice ? invoiceHref(invoice.code) : draft ? orderHref(draft.order.code) : ORDERS_PATH;

  if (saved) return <div className="mx-auto mt-5 w-full max-w-[44rem]">
    {asking && draft && <FinishOrderDialog orderCode={draft.order.code} onFinish={finishOrder} onSkip={() => setAsking(false)} />}
    <InvoiceFinishPanel invoice={saved.invoice} change={saved.change} subtracted={saved.subtractedFromDebt} onDone={() => router.push(backHref)} doneLabel="Về đơn đặt hàng" skipLabel="Để sau, về đơn đặt hàng" />
  </div>;

  const title = invoice ? `Sửa hóa đơn ${invoice.code}` : draft ? `Hóa đơn bán · đơn ${draft.order.code}` : "Hóa đơn bán";
  const sourceNote = invoice ? "Sửa số lượng, lô, giá hoặc giảm giá: công nợ của khách thay đổi đúng bằng phần chênh lệch; khách và vùng giữ nguyên."
    : draft ? `Lập từ đơn đặt hàng ${draft.order.code}: số lượng còn lại và giá lấy từ đơn; chọn lô, nhập số kg cân. Dòng bỏ trống số lượng sẽ không vào hóa đơn.` : undefined;
  return <EditorFrame title={title} backHref={backHref} source={sourceNote} tools={<ItemFinder placeholder="Thêm hàng ngoài đơn: tìm theo mã hoặc tên" items={products.filter((product) => product.statusId === IN_USE).map(optionOf)} onPick={add} />}>
    {confirmation.dialog}
    {submitter.question && <InvoiceQuestionDialog question={submitter.question} />}
    {pending && <VietQrDialog key={pending.code} sale={pending} ask={submitter.ask} onInvoice={(result) => { setPending(undefined); submitter.renew(); pendingList.reload(); afterSaved(result); }} onLeave={() => { setPending(undefined); submitter.renew(); pendingList.reload(); }} />}
    <div className={purchaseStyles.editorBody}>
      <div className={purchaseStyles.linesPanel}>
        {!invoice && !pending && <VietQrResumeNotice sales={pendingList.data ?? []} onResume={setPending} />}
        <InvoiceEditorLines lines={lines} lots={start.lots} notWholeLots={notWholeLots} kgPerCage={kgPerCage} onChange={change} onPickUnit={pickUnit}
          onRemove={(key) => setLines((current) => current.filter((line) => line.key !== key))}
          onWholeLot={(lotId, checked) => setNotWholeLots((current) => { const next = new Set(current); if (checked) next.delete(lotId); else next.add(lotId); return next; })} />
        {!lines.length && <div className={purchaseStyles.emptyLines}><InterfaceIcon name="product" /><strong>Chưa có hàng trong hóa đơn</strong><span>Tìm hàng theo mã hoặc tên ở ô phía trên để thêm dòng.</span></div>}
      </div>
      <aside className={purchaseStyles.side} aria-label="Thông tin hóa đơn bán">
        <div className={purchaseStyles.sideScroll}>
          <div className={purchaseStyles.supplierChosen}><InterfaceIcon name="user" /><span><strong>{walkIn || !customer ? "Khách lẻ" : customer.name}</strong>
            {!walkIn && customer && (customer.code || customer.phoneNumber) && <small>{customer.code && <Link className={purchaseStyles.link} href={customerHref(customer.code)} target="_blank">{customer.code}</Link>}{customer.code && customer.phoneNumber && " · "}{customer.phoneNumber}</small>}</span></div>
          <SideRow label="Mã hóa đơn"><input aria-label="Mã hóa đơn" readOnly={lockedCode} maxLength={30} placeholder={draft?.nextCode ? `${draft.nextCode} (tự động)` : "Mã hóa đơn tự động"}
            title={lockedCode ? "Hóa đơn đã nhận chuyển khoản VietQR theo mã này nên giữ nguyên mã" : "Để trống để hệ thống tự cấp mã"} value={code} onChange={(event) => setCode(event.target.value.replace(/\s/g, ""))} /></SideRow>
          <SideRow label="Vùng">{zone?.code ?? "—"}</SideRow>
          {order && <SideRow label="Đơn đặt hàng"><Link className={purchaseStyles.code} href={orderHref(order.code)} target="_blank">{order.code}</Link></SideRow>}
          <SideRow label="Thời gian">{viDateTime(invoice?.invoicedAt ?? openedAt)}</SideRow>
          {invoice && <SideRow label="Trạng thái">Hoàn thành</SideRow>}
          <div className={purchaseStyles.divider} />
          <SideRow label={`Tổng tiền hàng (${lines.filter((line) => line.quantity.trim() || line.kg.trim()).length})`}>{fmt(totals.subtotal)}</SideRow>
          <SideRow label="Giảm giá"><DiscountInput label="Giảm giá hóa đơn" base={totals.subtotal} value={discount} invalid={discount > totals.subtotal + otherCharges}
            onChange={(value) => { setDiscountValue(value); setDiscountTouched(true); setError(undefined); }} /></SideRow>
          <SideRow label="Chi phí khác"><MoneyInput label="Chi phí khác" value={otherCharges || null} onChange={(value) => { setOtherCharges(value); setError(undefined); }} /></SideRow>
          <SideRow label="Khách cần trả" strong>{fmt(totals.total)}</SideRow>
          {invoice ? <>
            <SideRow label="Đã thanh toán">{fmt(paid)}</SideRow>
            {totals.total !== invoice.total && <SideRow label="Chênh lệch công nợ">{totals.total > invoice.total ? "+" : "−"}{fmt(Math.abs(totals.total - invoice.total))}</SideRow>}
          </> : <>
            <SideRow label="Đã tạm ứng (tự động)">{fmt(totals.advance)}</SideRow>
            <SideRow label="Khách thanh toán (tiền mặt)"><MoneyInput label="Khách thanh toán" value={cash || null} disabled={locked} onChange={(value) => { setCash(value); setError(undefined); }} /></SideRow>
            {totals.rest > 0 && <label className={purchaseStyles.sub}><input type="checkbox" checked={payLater} disabled={locked} onChange={(event) => setPayLater(event.target.checked)} /> Trả sau phần còn lại <strong>{fmt(totals.rest)}</strong> (cần Chủ HTX đồng ý)</label>}
            {totals.extra > 0 && <p className={purchaseStyles.sub}>Khách đưa dư {fmt(totals.extra)} đ: hệ thống sẽ hỏi trừ vào công nợ hay trả lại.</p>}
            {totals.rest > 0 && <p className={purchaseStyles.sub}>VietQR thu {fmt(totals.rest)} đ bằng chuyển khoản; hóa đơn được lưu khi ngân hàng báo đã nhận tiền.</p>}
          </>}
          <textarea className={purchaseStyles.sideNote} aria-label="Ghi chú" placeholder="Ghi chú" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
          <ErrorNotice error={error} />
        </div>
        <div className={purchaseStyles.sideActions} style={invoice || totals.rest <= 0 ? { gridTemplateColumns: "1fr" } : undefined}>
          {!invoice && totals.rest > 0 && <Button variant="secondary" disabled={locked} onClick={() => void submit("vietQr")}>Thanh toán VietQR</Button>}
          <Button isPending={submitter.saving} disabled={locked} onClick={() => void submit("standard")}>{invoice ? "Lưu" : "Hoàn thành"}</Button>
        </div>
      </aside>
    </div>
  </EditorFrame>;
}
