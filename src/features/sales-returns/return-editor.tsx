"use client";
import { KctVatRow } from "@/features/purchase-documents/kct-vat-row";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useToast } from "@/components/ui/toast-provider";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { CustomerSearch, type PickedCustomer } from "@/features/customer-lookup/customer-search";
import { customerHref, invoiceHref } from "@/features/customers/customer-links";
import { lotsHref } from "@/features/harvest-lots/lot-labels";
import { ErrorNotice, Note, Skeleton, operationError, useRemote } from "@/features/operations/ui";
import { operationAllowed } from "@/features/operations/permissions";
import { EditorFrame, SideRow, fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import styles from "@/features/purchase-documents/purchases.module.css";
import { invoiceDetail, searchResult, type InvoiceDetail } from "@/features/sales-invoice-list/invoice-list-contracts";
import { paymentTerm } from "@/features/sales-invoice-list/invoice-labels";
import { invoiceRepository } from "@/features/sales-invoice-list/use-invoice-list";
import { orderHref } from "@/features/sales-orders/order-labels";
import { MAX_REASON, outcomes, type CreateReturnBody, type Outcome, type PreviewLine, type ReturnPreview, type ThrownAwayAnswer } from "./return-contracts";
import { RETURNS_PATH, offerText, outcomeLabel, salesReturnHref } from "./return-labels";
import { useLotQuestion } from "./return-lot-question";
import { returnRepository } from "./repository";

type Start = { invoiceId: string; preview: ReturnPreview; invoice: InvoiceDetail | null };
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The invoice the address names: by its code (`?invoice=HD000123`), or by id. A code that matches no invoice is an error, not an empty editor. */
async function resolveInvoiceId(reference: string, signal: AbortSignal): Promise<WorkspaceResult<string>> {
  if (guid.test(reference)) return { status: "success", data: reference };
  const found = await invoiceRepository.read("list", { code: reference, page: "1", pageSize: "20" }, searchResult, signal);
  if (found.status !== "success") return found;
  const match = found.data.page.items.find((row) => row.code.toLowerCase() === reference.toLowerCase());
  return match ? { status: "success", data: match.id } : { status: "error", httpStatus: 404, uncertain: false };
}

/**
 * The editor of a new sales return, a page of its own like the purchase return: the whole invoice comes back (no partial return), each line goes back for sale or is thrown away.
 * The preview of the API gives the lines, the value and the debt; the invoice itself (read when the account may) adds its time, zone and order. The save asks what the API asks (MSG-CLAIM-04, MSG-HARVEST-02).
 */
export function ReturnEditorPage({ invoice }: { invoice: string }) {
  const { identity, permissions } = useApiWorkspace();
  if (!operationAllowed("sales-returns", identity, permissions.functionPermissions, "Create")) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền tạo phiếu trả hàng bán.</p>;
  return <Loader invoice={invoice} />;
}

function Loader({ invoice }: { invoice: string }) {
  const remote = useRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<Start>> => {
    const resolved = await resolveInvoiceId(invoice, signal);
    if (resolved.status !== "success") return resolved;
    const [preview, detail] = await Promise.all([returnRepository.preview(resolved.data, undefined, signal), invoiceRepository.read("detail", { id: resolved.data }, invoiceDetail, signal)]);
    if (preview.status !== "success") return preview;
    return { status: "success", data: { invoiceId: resolved.data, preview: preview.data, invoice: detail.status === "success" ? detail.data : null } };
  }, [invoice]));
  if (remote.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được hóa đơn để trả hàng."} onRetry={remote.reload} retryLabel="Tải lại" />;
  return <Editor key={remote.data.invoiceId} start={remote.data} />;
}

function Editor({ start }: { start: Start }) {
  const { preview, invoice, invoiceId } = start, router = useRouter(), { notify } = useToast(), confirmation = useActionDialog(), lotQuestion = useLotQuestion();
  const [choices, setChoices] = useState<Record<string, Outcome>>({}), [reason, setReason] = useState(""), [term, setTerm] = useState("");
  const [buyer, setBuyer] = useState<PickedCustomer | null>(null), [error, setError] = useState<string>(), [pending, setPending] = useState(false);
  // A walk-in invoice shows the debt only once a customer profile is chosen: the API reads it for that profile.
  const walkIn = preview.requiresCustomer;
  const chosen = useRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<ReturnPreview | null>> => {
    if (!walkIn || !buyer) return { status: "success", data: null };
    return returnRepository.preview(invoiceId, buyer.id, signal);
  }, [walkIn, buyer, invoiceId]));
  const money = chosen.data ?? preview;
  const customer = preview.customer;
  const shown = useMemo(() => { const text = term.trim().toLowerCase(); return preview.lines.filter((line) => !text || line.productName.toLowerCase().includes(text) || line.lotCode.toLowerCase().includes(text)); }, [preview.lines, term]);
  const answered = preview.lines.filter((line) => choices[line.invoiceLineId]).length, owedBack = money.owedBackAfter;
  const debtNow = money.customerDebt ?? null, debtAfter = money.debtAfter ?? null;

  const setAll = (outcome: Outcome) => setChoices(Object.fromEntries(preview.lines.map((line) => [line.invoiceLineId, outcome])));
  const setChoice = (line: PreviewLine, outcome: Outcome) => { setChoices((current) => ({ ...current, [line.invoiceLineId]: outcome })); setError(undefined); };

  /** Sends the return, answering the questions the API asks one by one and sending the same return again with the answers so far. */
  async function send(body: Omit<CreateReturnBody, "thrownAwayLots" | "ownerAgreed">, ownerAgreed: boolean) {
    const answers: ThrownAwayAnswer[] = [];
    for (let round = 0; round < 60; round += 1) {
      const result = await returnRepository.create(invoiceId, { ...body, ...(ownerAgreed ? { ownerAgreed: true } : {}), ...(answers.length ? { thrownAwayLots: answers } : {}) });
      if (result.status === "success") {
        const saved = result.data, code = saved.return.code;
        notify({ tone: "success", title: `Đã tạo phiếu trả hàng ${code}.`, ...(saved.owedBack > 0 ? { description: `Hợp tác xã nợ lại khách ${fmt(saved.owedBack)} đ.` } : {}) });
        router.push(salesReturnHref(code));
        return;
      }
      const question = result.httpStatus === 409 ? result.invoiceConfirmation : undefined;
      if (question?.field === "ownerAgreed") {
        // The answer was already sent: asking again would loop, so the save stops with a message.
        if (ownerAgreed) { setError("Chủ hợp tác xã chưa được xác nhận đồng ý. Hãy nhờ Chủ hợp tác xã tạo phiếu này."); return; }
        if (!(await confirmation.confirm(`Chủ hợp tác xã đã đồng ý nhận lại toàn bộ hàng của hóa đơn ${preview.invoiceCode} (${fmt(question.returnValue ?? preview.value)} đ) và quyết định lô nào bán lại chưa?`))) return;
        ownerAgreed = true;
      } else if (question?.field === "thrownAwayLots" && question.harvestLotId && question.lotCode) {
        const answer = await lotQuestion.ask({ harvestLotId: question.harvestLotId, lotCode: question.lotCode, discardedKg: question.discardedKg ?? 0, remainingKg: question.remainingKg ?? 0 });
        if (!answer) return;
        answers.push(answer);
      } else { setError(operationError(result)); return; }
    }
    setError("Phiếu có quá nhiều câu hỏi chưa trả lời. Hãy tải lại trang và thử lại.");
  }

  async function complete() {
    const text = reason.trim();
    if (preview.lines.some((line) => !choices[line.invoiceLineId])) { setError("Chọn Bán lại hoặc Hủy bỏ cho từng dòng hàng."); return; }
    if (!text) { setError("Nhập lý do trả hàng."); return; }
    if (text.length > MAX_REASON) { setError(`Lý do tối đa ${MAX_REASON} ký tự.`); return; }
    if (walkIn && !buyer) { setError("Hóa đơn bán cho khách lẻ: hãy chọn hồ sơ khách hàng nhận lại tiền."); return; }
    const owe = owedBack > 0 ? ` Hợp tác xã sẽ nợ lại khách ${fmt(owedBack)} đ.` : "";
    const question = preview.ownerMustAgree
      ? `Chủ hợp tác xã đã đồng ý nhận lại toàn bộ hàng của hóa đơn ${preview.invoiceCode} (${fmt(preview.value)} đ) và quyết định lô nào bán lại chưa? Khi chủ hợp tác xã chưa đồng ý, phiếu không được lưu.${owe}`
      : `Hoàn thành phiếu trả hàng ${fmt(preview.value)} đ của hóa đơn ${preview.invoiceCode}? Toàn bộ hàng được trả lại; phiếu không sửa được, chỉ Chủ hợp tác xã được hủy.${owe}`;
    if (!(await confirmation.confirm(question))) return;
    setPending(true); setError(undefined);
    try {
      await send({ reason: text, rowVersion: preview.rowVersion, lines: preview.lines.map((line) => ({ invoiceLineId: line.invoiceLineId, outcome: choices[line.invoiceLineId] })), ...(walkIn && buyer ? { customerId: buyer.id } : {}) }, preview.ownerMustAgree);
    } finally { setPending(false); }
  }

  return <EditorFrame title="Tạo phiếu trả hàng" backHref={RETURNS_PATH} source={`Trả toàn bộ hàng của hóa đơn ${preview.invoiceCode}; không trả một phần.`}
    tools={<div className={styles.finder}><InterfaceIcon name="search" /><input type="search" aria-label="Tìm dòng hàng" placeholder="Tìm theo tên hàng hoặc mã lô" maxLength={100} value={term} onChange={(event) => setTerm(event.target.value)} /></div>}>
    {confirmation.dialog}{lotQuestion.dialog}
    <div className={styles.editorBody}>
      <div className={styles.linesPanel}>
        <table className={styles.lines} aria-label="Dòng hàng của hóa đơn"><thead><tr><th className={styles.narrow}>STT</th><th>Tên hàng</th><th>Lô thu hoạch</th><th className={styles.num}>kg</th><th className={styles.num}>Đơn giá</th><th className={styles.num}>Thành tiền</th>
          <th><span className="mr-2">Xử lý</span><button type="button" className={styles.link} onClick={() => setAll("BackForSale")}>Tất cả bán lại</button> · <button type="button" className={styles.link} onClick={() => setAll("ThrownAway")}>Tất cả hủy bỏ</button></th></tr></thead>
          <tbody>{shown.map((line) => <tr key={line.invoiceLineId}>
            <td className={styles.narrow}>{line.lineNumber}</td><td>{line.productName}</td>
            <td><Link className={styles.link} href={lotsHref(line.lotCode)}>{line.lotCode}</Link>{line.lotStatus && <span className={styles.sub}>{line.lotStatus}</span>}</td>
            <td className={styles.num}>{fmt(line.kg)}</td><td className={styles.num}>{fmt(line.unitPrice)}</td><td className={styles.amount}>{fmt(line.amount)}</td>
            <td><div className={styles.methods} role="radiogroup" aria-label={`Xử lý dòng ${line.lineNumber}`} style={{ margin: 0 }}>{outcomes.map((outcome) => <label key={outcome}>
              <input type="radio" className="sr-only" name={`outcome-${line.invoiceLineId}`} checked={choices[line.invoiceLineId] === outcome} onChange={() => setChoice(line, outcome)} />{outcomeLabel[outcome]}</label>)}</div></td>
          </tr>)}
            {!shown.length && <tr><td colSpan={7} className={styles.empty}>Không có dòng hàng phù hợp.</td></tr>}
          </tbody></table>
        <p className={styles.hint}>Chọn theo quyết định của chủ hợp tác xã sau khi kiểm tra hàu trả lại. Hàng Bán lại trở về kho của lô (lô đã đóng được mở lại); hàng Hủy bỏ bị mất, không trở về kho.</p>
      </div>
      <aside className={styles.side} aria-label="Thông tin phiếu trả hàng">
        <div className={styles.sideScroll}>
          <SideRow label="Hóa đơn"><Link className={styles.link} href={invoiceHref(preview.invoiceCode)}>{preview.invoiceCode}</Link></SideRow>
          {invoice && <SideRow label="Thời gian hóa đơn">{viDateTime(invoice.invoicedAt)}</SideRow>}
          {invoice && <SideRow label="Vùng">{invoice.zone.code}</SideRow>}
          {invoice && <SideRow label="Đơn đặt hàng">{invoice.salesOrder ? <Link className={styles.link} href={orderHref(invoice.salesOrder.code)}>{invoice.salesOrder.code}</Link> : "—"}</SideRow>}
          {invoice && <SideRow label="Hình thức thanh toán">{paymentTerm(invoice.paymentTerm)}</SideRow>}
          <SideRow label="Khách hàng">{customer ? customer.code ? <Link className={styles.link} href={customerHref(customer.code)}>{customer.name}</Link> : customer.name : walkIn ? "Khách lẻ" : "—"}</SideRow>
          {walkIn && <div><p className={styles.hint}>Hóa đơn bán cho khách lẻ: chọn hồ sơ khách hàng để ghi nhận công nợ và tiền hợp tác xã nợ lại.</p><CustomerSearch value={buyer} onSelect={setBuyer} /></div>}
          <div className={styles.divider} />
          {preview.qualityClaims.length > 0 ? <div className={styles.sub} aria-label="Khiếu nại của hóa đơn"><strong>Khiếu nại của hóa đơn</strong>
            {preview.qualityClaims.map((claim) => <p key={claim.id}>{claim.code} · {viDateTime(claim.sentAt)} · {claim.status || "—"} · {offerText(claim.offer)}</p>)}</div>
            : <p className={styles.sub}>Hóa đơn chưa có khiếu nại chất lượng.</p>}
          <div className={styles.divider} />
          <KctVatRow layout="side" />
          <SideRow label={`Giá trị phiếu trả (${preview.lines.length} dòng)`} strong>{fmt(preview.value)}</SideRow>
          <SideRow label="Công nợ hiện tại của khách">{chosen.loading && walkIn && buyer ? "…" : debtNow === null ? "—" : fmt(debtNow)}</SideRow>
          <SideRow label="Công nợ sau phiếu trả">{debtAfter === null ? "—" : fmt(debtAfter)}</SideRow>
          {owedBack > 0 && <SideRow label="Hợp tác xã nợ lại khách" strong>{fmt(owedBack)}</SideRow>}
          {owedBack > 0 && <p className={styles.sub}>Tiền khách đã trả vượt phần còn nợ trở thành khoản hợp tác xã nợ lại khách (công nợ âm); kế toán trả lại hoặc trừ vào hóa đơn sau.</p>}
          {chosen.error && <ErrorNotice error={chosen.error} />}
          <Note label="Lý do trả hàng *" required aria-required="true" maxLength={MAX_REASON} value={reason} onChange={(event) => { setReason(event.target.value); setError(undefined); }} />
          <p className={styles.sub}>{answered}/{preview.lines.length} dòng đã chọn cách xử lý.</p>
          <ErrorNotice error={error} />
        </div>
        <div className={styles.sideActions} style={{ gridTemplateColumns: "1fr" }}><Button disabled={pending} isPending={pending} onClick={() => void complete()}>Hoàn thành</Button></div>
      </aside>
    </div>
  </EditorFrame>;
}
