"use client";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { createOperationsRepository } from "./repository";
import * as c from "./new-module-contracts";
import { ErrorNotice, Field, Note, Select, businessToday, displayTime, useRemote } from "./ui";
import { useOperationEditor } from "./use-operation-editor";

const products = createOperationsRepository("sales-products"), requests = createOperationsRepository("purchase-requests");
export const requestStatusLabel = (status: string) => ({ AWAITING_RESPONSE: "Chờ phản hồi", ACCEPTED: "Đã chấp nhận", DECLINED: "Đã từ chối", CANCELLED: "Đã hủy" }[status] ?? status);
type Product = z.infer<typeof c.salesProductSchema>;

export function ProductEditor({ record, onClose, onSaved }: { record: Product | null; onClose(): void; onSaved(): void }) {
  const [initial] = useState(() => ({ code: record?.code ?? "", name: record?.name ?? "", description: record?.description ?? "", inUse: record?.inUse ?? true }));
  const [values, setValues] = useState(initial), [error, setError] = useState<string>(), [latest, setLatest] = useState<Product>();
  const baseline = useRef(record), editor = useOperationEditor(onClose, JSON.stringify(values) !== JSON.stringify(initial));
  async function save() {
    const payload = c.saveProductSchema.safeParse({ ...values, description: values.description || null, rowVersion: baseline.current?.rowVersion ?? null });
    if (!payload.success) { setError("Hãy kiểm tra mã, tên và mô tả sản phẩm."); return; }
    setError(undefined);
    const saved = await editor.submit(`Lưu sản phẩm ${values.name} với trạng thái ${values.inUse ? "đang dùng" : "ngừng dùng"}?`, () => products.write(record ? "update" : "create", payload.data, c.salesProductSchema, record?.id));
    if (saved) onSaved();
  }
  return <Dialog open title={record ? `Sản phẩm ${record.code}` : "Thêm sản phẩm bán"} dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>{editor.dialog}<ErrorNotice error={error || editor.mutation.error} />
    <form onSubmit={(e) => { e.preventDefault(); void save(); }}><fieldset disabled={editor.disabled} className="space-y-4"><Field label="Mã sản phẩm *" required maxLength={50} value={values.code} onChange={(e) => setValues({ ...values, code: e.target.value })} />
      <Field label="Tên sản phẩm *" required maxLength={200} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} /><Note label="Mô tả" maxLength={2000} value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} />
      <label className="flex gap-3"><input type="checkbox" checked={values.inUse} onChange={(e) => setValues({ ...values, inUse: e.target.checked })} />Đang dùng</label><Button type="submit">Lưu sản phẩm</Button></fieldset></form>
    {editor.mutation.blocked && <p className="mt-3">Bản nháp đang được giữ. Hãy đối chiếu danh mục trước khi thực hiện tiếp.</p>}
    {record && editor.mutation.blocked && <Button className="mt-3" variant="secondary" disabled={editor.pending} onClick={async () => { const found = await editor.mutation.run(() => products.read("all", {}, z.array(c.salesProductSchema)), true); if (found) setLatest(found.find((r) => r.id === record.id)); }}>Tải sản phẩm mới để đối chiếu</Button>}
    {latest && <section className="mt-4 rounded-control border border-border p-4"><h3 className="font-semibold">Sản phẩm hiện tại</h3><p>{latest.code} · {latest.name} · {latest.inUse ? "Đang dùng" : "Ngừng dùng"}</p><p className="whitespace-pre-wrap">{latest.description}</p>{!editor.mutation.uncertain && <Button variant="secondary" onClick={() => { baseline.current = latest; editor.mutation.reviewed(); setLatest(undefined); }}>Đã đối chiếu, giữ nháp để sửa tiếp</Button>}</section>}
    <Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
  </Dialog>;
}

export function CreatePurchaseRequest({ onClose, onSaved }: { onClose(): void; onSaved(): void }) {
  const [values, setValues] = useState({ productId: "", requestedCages: "", pickupDate: businessToday(), note: "" });
  const [initial] = useState(() => JSON.stringify(values)), [clientOperationId] = useState(() => crypto.randomUUID()), [error, setError] = useState<string>();
  const catalog = useRemote(useMemo(() => (signal: AbortSignal) => products.read("list", {}, z.array(c.salesProductSchema), signal), []));
  const editor = useOperationEditor(onClose, JSON.stringify(values) !== initial);
  async function save() {
    const payload = c.createRequestSchema.safeParse({ ...values, requestedCages: Number(values.requestedCages), note: values.note || null, clientOperationId });
    if (!payload.success || values.pickupDate < businessToday()) { setError("Chọn sản phẩm, số lồng nguyên dương và ngày nhận từ hôm nay."); return; }
    setError(undefined);
    const saved = await editor.submit(`Gửi yêu cầu mua ${values.requestedCages} lồng ${catalog.data?.find((p) => p.id === values.productId)?.name ?? "sản phẩm đã chọn"}, nhận ngày ${values.pickupDate}?`, () => requests.write("submit", payload.data, c.purchaseRequestSchema));
    if (saved) onSaved();
  }
  return <Dialog open title="Gửi yêu cầu mua" dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>{editor.dialog}<ErrorNotice error={error || editor.mutation.error || catalog.error} />
    <Button variant="secondary" disabled={catalog.loading || editor.pending} onClick={catalog.reload}>Tải lại sản phẩm</Button>
    <form className="mt-4" onSubmit={(e) => { e.preventDefault(); void save(); }}><fieldset disabled={editor.disabled} className="space-y-4"><Select label="Sản phẩm *" required value={values.productId} onChange={(e) => setValues({ ...values, productId: e.target.value })}><option value="">Chọn sản phẩm</option>{catalog.data?.filter((p) => p.availableForPurchase).map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</Select>
      <Field label="Số lồng yêu cầu *" type="number" required min={1} step={1} max={2147483647} value={values.requestedCages} onChange={(e) => setValues({ ...values, requestedCages: e.target.value })} /><Field label="Ngày nhận dự kiến *" type="date" required min={businessToday()} value={values.pickupDate} onChange={(e) => setValues({ ...values, pickupDate: e.target.value })} />
      <Note label="Ghi chú" maxLength={500} value={values.note} onChange={(e) => setValues({ ...values, note: e.target.value })} /><Button type="submit">Gửi yêu cầu</Button></fieldset></form>
    {editor.mutation.blocked && <p className="mt-3">Bản nháp đang được giữ. Hãy kiểm tra danh sách yêu cầu mua trước khi lập lượt mới; hệ thống không tự gửi lại.</p>}
    <Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
  </Dialog>;
}

export function PurchaseRequestDetails({ record, onClose, onSaved }: { record: c.PurchaseRequest; onClose(): void; onSaved(record: c.PurchaseRequest): void }) {
  const { identity } = useApiWorkspace(), mine = identity.subjectType === "Trader", owner = identity.subjectType === "CooperativeOwner";
  const [initial] = useState(() => ({ mode: "accept", count: String(record.requestedCages), day: record.requestedPickupDate, allow: false, note: "" }));
  const [values, setValues] = useState(initial), [latest, setLatest] = useState<c.PurchaseRequest>(), [error, setError] = useState<string>();
  const [baseline, setBaseline] = useState(record), editor = useOperationEditor(onClose, JSON.stringify(values) !== JSON.stringify(initial));
  const canRespond = owner && baseline.status === "AWAITING_RESPONSE", canCancel = mine && ["AWAITING_RESPONSE", "ACCEPTED"].includes(baseline.status);
  async function save() {
    const accept = values.mode === "accept";
    const payload = canCancel ? c.cancelRequestSchema.safeParse({ reason: values.note || null, rowVersion: baseline.rowVersion }) : c.respondRequestSchema.safeParse({ accept, acceptedCages: accept ? Number(values.count) : null, pickupDate: accept ? values.day : null, allowPayLater: accept && values.allow, note: values.note || null, rowVersion: baseline.rowVersion });
    if (!payload.success || canRespond && accept && (Number(values.count) > baseline.requestedCages || values.day < businessToday())) { setError("Kiểm tra số lồng chấp nhận, ngày nhận và lý do từ chối."); return; }
    if (!canRespond && !canCancel) return;
    setError(undefined);
    const saved = await editor.submit(canCancel ? `Hủy yêu cầu ${baseline.code}?` : `${accept ? `Chấp nhận ${values.count} lồng, nhận ${values.day}${values.allow ? ", cho trả sau" : ", không cho trả sau"}` : "Từ chối"} yêu cầu ${baseline.code}?`, () => requests.write(canCancel ? "cancel" : "respond", payload.data, c.purchaseRequestSchema, baseline.id));
    if (saved) onSaved(saved);
  }
  return <Dialog open title={`Yêu cầu ${record.code}`} size="lg" dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>{editor.dialog}
    <dl className="grid gap-4 sm:grid-cols-2">{[["Thương lái", baseline.customerName], ["Sản phẩm", baseline.productName], ["Trạng thái", requestStatusLabel(baseline.status)], ["Tạo lúc", displayTime(baseline.createdAt)], ["Số lồng yêu cầu", baseline.requestedCages], ["Ngày nhận dự kiến", baseline.requestedPickupDate], ["Ghi chú", baseline.note], ["Số lồng chấp nhận", baseline.acceptedCages], ["Ngày nhận đã chấp nhận", baseline.acceptedPickupDate], ["Cho trả sau", baseline.acceptedCages !== null ? baseline.allowPayLater ? "Có" : "Không" : "—"], ["Phản hồi của HTX", baseline.responseNote], ["Phản hồi lúc", baseline.respondedAt && displayTime(baseline.respondedAt)], ["Hủy lúc", baseline.cancelledAt && displayTime(baseline.cancelledAt)], ["Lý do hủy", baseline.cancellationReason]].map(([label, value]) => <div key={String(label)}><dt className="text-sm text-text-muted">{label}</dt><dd className="whitespace-pre-wrap break-words">{value ?? "—"}</dd></div>)}</dl>
    <ErrorNotice error={error || editor.mutation.error} />{(canRespond || canCancel) && <form className="mt-5" onSubmit={(e) => { e.preventDefault(); void save(); }}><fieldset disabled={editor.disabled} className="space-y-4">
      {canRespond && <><Select label="Phản hồi *" value={values.mode} onChange={(e) => setValues({ ...values, mode: e.target.value })}><option value="accept">Chấp nhận</option><option value="decline">Từ chối</option></Select>{values.mode === "accept" && <><Field label="Số lồng chấp nhận *" type="number" required min={1} max={baseline.requestedCages} step={1} value={values.count} onChange={(e) => setValues({ ...values, count: e.target.value })} /><Field label="Ngày nhận đã chấp nhận *" type="date" required min={businessToday()} value={values.day} onChange={(e) => setValues({ ...values, day: e.target.value })} /><label className="flex gap-3"><input type="checkbox" checked={values.allow} onChange={(e) => setValues({ ...values, allow: e.target.checked })} />Cho trả sau</label></>}</>}
      <Note label={canCancel ? "Lý do hủy" : values.mode === "decline" ? "Lý do từ chối *" : "Ghi chú phản hồi"} required={canRespond && values.mode === "decline"} maxLength={500} value={values.note} onChange={(e) => setValues({ ...values, note: e.target.value })} /><Button type="submit">{canCancel ? "Hủy yêu cầu mua" : "Lưu phản hồi"}</Button></fieldset></form>}
    {editor.mutation.blocked && <><p className="mt-4">Bản nháp đang được giữ. Tải dữ liệu mới để đối chiếu; không tự gửi lại.</p><Button variant="secondary" disabled={editor.pending} onClick={async () => { const found = await editor.mutation.run(() => requests.read(mine ? "mine-detail" : "detail", { id: record.id }, c.purchaseRequestSchema), true); if (found) setLatest(found); }}>Tải yêu cầu mới để đối chiếu</Button></>}
    {latest && <section className="mt-4 rounded-control border border-border p-4"><h3 className="font-semibold">Yêu cầu hiện tại</h3><p>{requestStatusLabel(latest.status)} · {latest.acceptedCages ?? latest.requestedCages} lồng · {latest.acceptedPickupDate ?? latest.requestedPickupDate}</p><p>{latest.responseNote || latest.cancellationReason}</p>{!editor.mutation.uncertain && <Button variant="secondary" onClick={() => { setBaseline(latest); editor.mutation.reviewed(); setLatest(undefined); }}>Đã đối chiếu, giữ nháp để sửa tiếp</Button>}</section>}
    <Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
  </Dialog>;
}
