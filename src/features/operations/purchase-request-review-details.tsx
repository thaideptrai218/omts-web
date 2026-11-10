"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { formatDate, formatDateTime, formatKg } from "@/features/trader-purchases/presentation";
import { createOperationsRepository } from "./repository";
import * as c from "./new-module-contracts";
import { ErrorNotice, Field, Note, Select, businessToday, money } from "./ui";
import { useOperationEditor } from "./use-operation-editor";
import { PurchaseRequestSendings, ReviewStatusPill } from "./purchase-request-review-parts";
import { buildAcceptPayload, buildDeclinePayload, canRespondToRequest, reviewResponseSummary } from "./purchase-request-review-presentation";

const requests = createOperationsRepository("purchase-requests");

/** Chi tiết yêu cầu mua cho Chủ HTX / quản lý vùng; chỉ Chủ HTX trả lời được, một lần, khi đơn còn "Chờ phản hồi" (BR-SALE-02). */
export function PurchaseRequestReviewDetails({ record, onClose, onSaved }: { record: c.PurchaseRequest; onClose(): void; onSaved(record: c.PurchaseRequest): void }) {
  const { identity } = useApiWorkspace(), owner = identity.subjectType === "CooperativeOwner";
  const [initial] = useState(() => ({ mode: "accept", kg: String(record.requestedKg), pickupDate: record.pickupDate, payLater: false, note: "" }));
  const [values, setValues] = useState(initial), [latest, setLatest] = useState<c.PurchaseRequest>(), [error, setError] = useState<string>();
  const [baseline, setBaseline] = useState(record), editor = useOperationEditor(onClose, JSON.stringify(values) !== JSON.stringify(initial));
  const canRespond = owner && canRespondToRequest(baseline), accept = values.mode === "accept", summary = reviewResponseSummary(baseline);
  async function save() {
    const built = accept ? buildAcceptPayload({ kg: values.kg, pickupDate: values.pickupDate, payLater: values.payLater, note: values.note }, baseline, businessToday()) : buildDeclinePayload(values.note, baseline);
    if (!built.ok) { setError(built.error); return; }
    setError(undefined);
    const message = accept ? `Chấp nhận ${formatKg(Number(values.kg.replace(",", ".")))}, lấy ngày ${formatDate(values.pickupDate)}, ${values.payLater ? "cho trả sau" : "không cho trả sau"}? Phản hồi đã gửi không thể sửa.` : "Từ chối yêu cầu này? Phản hồi đã gửi không thể sửa.";
    const saved = await editor.submit(message, () => requests.write(accept ? "accept" : "decline", built.value, c.purchaseRequestSchema, baseline.id));
    if (saved) onSaved(saved);
  }
  const rows: [string, string][] = [
    ["Thương lái", baseline.customer.name], ["Số điện thoại", baseline.customer.phoneNumber || "—"], ["Công nợ hiện tại", money(baseline.customer.currentDebt)], ["Sản phẩm", baseline.productName],
    ["Số kg yêu cầu", formatKg(baseline.requestedKg)], ["Ngày lấy hàng", formatDate(baseline.pickupDate)], ["Gửi lúc", formatDateTime(baseline.sentAt)], ["Ghi chú của thương lái", baseline.note || "—"],
  ];
  return <Dialog open title="Chi tiết yêu cầu mua" size="lg" dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>{editor.dialog}
    <p><ReviewStatusPill request={baseline} /></p>
    <dl className="mt-4 grid gap-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label}><dt className="text-sm text-text-muted">{label}</dt><dd className="whitespace-pre-wrap break-words">{value}</dd></div>)}
      <div className="sm:col-span-2"><dt className="text-sm text-text-muted">Phản hồi của hợp tác xã{baseline.response ? ` lúc ${formatDateTime(baseline.response.respondedAt)}` : ""}</dt><dd className="whitespace-pre-wrap break-words"><strong>{summary.headline}</strong>{summary.note && <span className="block">{summary.note}</span>}</dd></div>
      {baseline.cancelledAt && <div><dt className="text-sm text-text-muted">Hủy lúc</dt><dd>{formatDateTime(baseline.cancelledAt)}</dd></div>}</dl>
    <PurchaseRequestSendings sendings={baseline.sendings} />
    <ErrorNotice error={error || editor.mutation.error} />
    {canRespond && <form className="mt-5" onSubmit={(e) => { e.preventDefault(); void save(); }}><fieldset disabled={editor.disabled} className="space-y-4">
      <Select label="Phản hồi *" value={values.mode} onChange={(e) => setValues({ ...values, mode: e.target.value })}><option value="accept">Chấp nhận</option><option value="decline">Từ chối</option></Select>
      {accept && <><Field label="Số kg chấp nhận *" inputMode="decimal" required value={values.kg} onChange={(e) => setValues({ ...values, kg: e.target.value })} /><Field label="Ngày lấy hàng *" type="date" required min={businessToday()} value={values.pickupDate} onChange={(e) => setValues({ ...values, pickupDate: e.target.value })} />
        <label className="flex gap-3"><input type="checkbox" checked={values.payLater} onChange={(e) => setValues({ ...values, payLater: e.target.checked })} />Cho trả sau</label></>}
      <Note label={accept ? "Ghi chú phản hồi" : "Lý do từ chối *"} required={!accept} maxLength={1000} value={values.note} onChange={(e) => setValues({ ...values, note: e.target.value })} /><Button type="submit">Gửi phản hồi</Button></fieldset></form>}
    {!owner && canRespondToRequest(baseline) && <p className="mt-4 text-sm text-text-muted">Chỉ Chủ hợp tác xã được trả lời yêu cầu mua; bạn có quyền xem.</p>}
    {editor.mutation.blocked && <><p className="mt-4">Bản nháp đang được giữ. Tải dữ liệu mới để đối chiếu; không tự gửi lại.</p><Button variant="secondary" disabled={editor.pending} onClick={async () => { const found = await editor.mutation.run(() => requests.read("detail", { id: record.id }, c.purchaseRequestSchema), true); if (found) setLatest(found); }}>Tải yêu cầu mới để đối chiếu</Button></>}
    {latest && <section className="mt-4 rounded-control border border-border p-4"><h3 className="font-semibold">Yêu cầu hiện tại</h3><p>{latest.status} · {formatKg(latest.requestedKg)} · {formatDate(latest.pickupDate)}</p>{!editor.mutation.uncertain && <Button variant="secondary" onClick={() => { setBaseline(latest); editor.mutation.reviewed(); setLatest(undefined); }}>Đã đối chiếu, giữ nháp để sửa tiếp</Button>}</section>}
    <Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
  </Dialog>;
}
