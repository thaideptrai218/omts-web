"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { createOperationsRepository } from "./repository";
import * as c from "./new-module-contracts";
import { DataTable, ErrorNotice, Field, Note, Select, Skeleton, businessToday, displayTime, useRemote } from "./ui";
import { useOperationEditor } from "./use-operation-editor";

const requests = createOperationsRepository("purchase-requests"), mine = createOperationsRepository("my-work");
type Staffing = z.infer<typeof c.purchaseStaffingSchema>;
type Shift = z.infer<typeof c.myPurchaseShiftSchema>;
export function StaffingSummary({ value }: { value: Staffing }) {
  return <section className="mt-5 rounded-card border border-border bg-primary-soft/40 p-4"><h3 className="font-semibold">Kế hoạch nhân lực</h3>
    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">{[["Số lồng kế hoạch", value.cages], ["Ngày làm", value.workDate], ["Ngày nhận", value.pickupDate], ["Lồng/người/ngày", value.cagesPerEmployeePerDay], ["Đã đồng ý / Cần", `${value.approvedEmployees} / ${value.requiredEmployees}`], ["Chờ / Từ chối", `${value.pendingEmployees} / ${value.declinedEmployees}`]].map(([label, text]) => <div key={label}><dt className="text-text-muted">{label}</dt><dd className="mt-1 font-semibold">{text}</dd></div>)}</dl>
    <p className="mt-3 text-sm">{value.hasEnoughStaff ? "Đã đủ nhân lực xác nhận. Chủ nhiệm HTX quyết định nhận đơn." : "Chưa đủ nhân lực xác nhận để nhận đơn."}</p>{value.note && <p className="mt-2 whitespace-pre-wrap text-sm">{value.note}</p>}
  </section>;
}

export function PurchaseStaffingPanel({ record, disabled, onUpdated }: { record: c.PurchaseRequest; disabled: boolean; onUpdated(record: c.PurchaseRequest): void }) {
  const [planning, setPlanning] = useState(false);
  const invitations = useRemote(useMemo(() => (signal: AbortSignal) => requests.read("staffing", { id: record.id }, z.array(c.shiftInvitationSchema), signal), [record.id]));
  const canPlan = ["AWAITING_RESPONSE", "AWAITING_STAFF"].includes(record.status) && (!record.staffing || record.staffing.workDate >= businessToday());
  return <section className="mt-5 border-t border-border pt-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Lời mời nhân viên</h3><Button className="w-auto" variant="secondary" disabled={invitations.loading || disabled} onClick={invitations.reload}>Tải lại lời mời</Button></div>
    <ErrorNotice error={invitations.error} />{invitations.loading ? <Skeleton /> : invitations.data && <DataTable headings={["Nhân viên", "Phản hồi", "Lý do", "Phản hồi lúc"]} empty={!invitations.data.length}>{invitations.data.map((row) => <tr key={row.id}><td>{row.employeeName}</td><td>{row.approved === null ? "Chờ xác nhận" : row.approved ? "Đồng ý" : "Từ chối"}</td><td className="whitespace-pre-wrap">{row.reason || "—"}</td><td>{row.respondedAt ? displayTime(row.respondedAt) : "—"}</td></tr>)}</DataTable>}
    {canPlan && <Button className="w-auto" disabled={disabled || invitations.loading || !invitations.data} onClick={() => setPlanning(true)}>{record.staffing ? "Mời thêm nhân viên" : "Lập kế hoạch và mời nhân viên"}</Button>}
    {planning && <PlanStaffingEditor record={record} invitedIds={invitations.data?.map((r) => r.employeeId) ?? []} onClose={() => setPlanning(false)} onSaved={onUpdated} />}
  </section>;
}

export function PlanStaffingEditor({ record, invitedIds, onClose, onSaved }: { record: c.PurchaseRequest; invitedIds: string[]; onClose(): void; onSaved(record: c.PurchaseRequest): void }) {
  const plan = record.staffing;
  const [values, setValues] = useState(() => ({ cages: String(plan?.cages ?? record.requestedCages), workDate: plan?.workDate ?? businessToday(), pickupDate: plan?.pickupDate ?? record.requestedPickupDate, capacity: plan ? String(plan.cagesPerEmployeePerDay) : "", note: plan?.note ?? "", employeeIds: [] as string[] }));
  const [initial] = useState(() => JSON.stringify(values)), [error, setError] = useState<string>(), [sent, setSent] = useState(false), [latest, setLatest] = useState<c.PurchaseRequest>();
  const editor = useOperationEditor(onClose, !sent && JSON.stringify(values) !== initial);
  const people = useRemote(useMemo(() => (signal: AbortSignal) => values.workDate && values.workDate >= businessToday() ? requests.read("staffing-employees", { day: values.workDate }, z.array(c.staffingEmployeeSchema), signal) : Promise.resolve({ status: "error" as const, httpStatus: 400, uncertain: false }), [values.workDate]));
  async function refreshSaved() { const found = await editor.mutation.run(() => requests.read("detail", { id: record.id }, c.purchaseRequestSchema), true); if (found) onSaved(found); }
  async function save() {
    const payload = c.planStaffingSchema.safeParse({ cages: Number(values.cages), workDate: values.workDate, pickupDate: values.pickupDate, cagesPerEmployeePerDay: Number(values.capacity), employeeIds: values.employeeIds, note: plan ? plan.note : values.note.trim() || null, rowVersion: record.rowVersion });
    if (!payload.success || Number(values.cages) > record.requestedCages || values.workDate < businessToday() || !people.data || values.employeeIds.some((id) => !people.data!.some((p) => p.id === id && p.available))) { setError("Kiểm tra số lồng, ngày làm/nhận, năng suất nguyên dương và chọn ít nhất một nhân viên khả dụng."); return; }
    setError(undefined);
    const saved = await editor.submit(`Gửi lời mời cho ${values.employeeIds.length} nhân viên, làm ${values.workDate}, ${values.cages} lồng? Kế hoạch đã gửi sẽ được giữ nguyên.`, () => requests.write("plan-staffing", payload.data, c.purchaseStaffingSchema, record.id));
    if (saved) { setSent(true); await refreshSaved(); }
  }
  const required = Number(values.cages) > 0 && Number(values.capacity) > 0 ? Math.ceil(Number(values.cages) / Number(values.capacity)) : undefined;
  return <Dialog open size="lg" title={plan ? "Mời thêm nhân viên" : "Lập kế hoạch nhân lực"} dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>{editor.dialog}
    <ErrorNotice error={error || people.error || editor.mutation.error} />{sent && <p role="status" className="my-3">Đã gửi lời mời. Tải yêu cầu mới để cập nhật tiến độ; không gửi lại lời mời.</p>}
    <form onSubmit={(e) => { e.preventDefault(); if (!sent) void save(); }}><fieldset disabled={editor.disabled || sent} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Số lồng kế hoạch *" type="number" min={1} max={record.requestedCages} step={1} required readOnly={!!plan} value={values.cages} onChange={(e) => setValues({ ...values, cages: e.target.value })} /><Field label="Năng suất (lồng/người/ngày) *" type="number" min={1} max={2147483647} step={1} required readOnly={!!plan} value={values.capacity} onChange={(e) => setValues({ ...values, capacity: e.target.value })} /><Field label="Ngày làm *" type="date" min={businessToday()} required readOnly={!!plan} value={values.workDate} onChange={(e) => setValues({ ...values, workDate: e.target.value, employeeIds: [] })} /><Field label="Ngày nhận hàng *" type="date" min={values.workDate} required readOnly={!!plan} value={values.pickupDate} onChange={(e) => setValues({ ...values, pickupDate: e.target.value })} /></div>
      <Note label="Ghi chú ca làm" maxLength={500} readOnly={!!plan} value={values.note} onChange={(e) => setValues({ ...values, note: e.target.value })} />
      <p className="text-sm text-text-muted">{required ? `Cần ít nhất ${required} người đồng ý ca. ` : "Nhập số lồng và năng suất để tính số người cần. "}{plan ? "Kế hoạch đã gửi được giữ nguyên; bạn có thể mời thêm người." : "Gửi lời mời chưa đồng nghĩa với nhận đơn."}</p>
      <Button className="w-auto" variant="secondary" disabled={people.loading} onClick={people.reload}>Tải lại nhân viên khả dụng</Button>
      {people.loading ? <Skeleton /> : <div className="max-h-72 overflow-auto divide-y divide-border rounded-control border border-border">{people.data?.map((p) => { const invited = invitedIds.includes(p.id); return <label key={p.id} className="flex min-h-12 items-center gap-3 p-3 text-sm"><input type="checkbox" disabled={!p.available || invited} checked={invited || values.employeeIds.includes(p.id)} onChange={(e) => setValues({ ...values, employeeIds: e.target.checked ? [...values.employeeIds, p.id] : values.employeeIds.filter((id) => id !== p.id) })} /><span>{p.name}<span className="ml-2 text-xs text-text-muted">{invited ? "Đã mời" : p.unavailableReason || "Khả dụng"}</span></span></label>; })}{people.data?.length === 0 && <p className="p-3 text-sm">Chưa có nhân viên để mời.</p>}</div>}
      <Button type="submit" disabled={!values.employeeIds.length || people.loading}>Gửi lời mời nhân viên</Button>
    </fieldset></form>
    {sent && <Button className="mt-3" variant="secondary" disabled={editor.pending} onClick={() => void refreshSaved()}>Tải yêu cầu sau khi gửi</Button>}
    {editor.mutation.blocked && <><p className="mt-3 text-sm">Bản nháp được giữ. Tải bản ghi mới để đối chiếu; không tự gửi lại. Đóng và mở lại kế hoạch sau khi kiểm tra kết quả.</p><Button className="mt-3" variant="secondary" disabled={editor.pending} onClick={async () => { const found = await editor.mutation.run(() => requests.read("detail", { id: record.id }, c.purchaseRequestSchema), true); if (found) setLatest(found); }}>Tải kế hoạch hiện tại</Button></>}
    {latest && <div className="mt-3"><p>Phiên bản hiện tại: {latest.code}</p>{latest.staffing ? <StaffingSummary value={latest.staffing} /> : <p>Chưa có kế hoạch nhân lực.</p>}</div>}
    <Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
  </Dialog>;
}

export function MyPurchaseShifts({ period, valid }: { period: { from: string; to: string }; valid: boolean }) {
  const [selected, setSelected] = useState<Shift>();
  const shifts = useRemote(useMemo(() => (signal: AbortSignal) => valid ? mine.read("purchase-shifts", period, z.array(c.myPurchaseShiftSchema), signal) : Promise.resolve({ status: "error" as const, httpStatus: 400, uncertain: false }), [valid, period]));
  return <section className="mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Lời mời ca theo yêu cầu mua</h2><Button className="w-auto" variant="secondary" disabled={!valid || shifts.loading} onClick={shifts.reload}>Tải lại lời mời ca</Button></div><ErrorNotice error={valid ? shifts.error : undefined} />
    {shifts.loading ? <Skeleton /> : shifts.data && <DataTable headings={["Yêu cầu / Sản phẩm", "Ngày làm / Ngày nhận", "Số lồng", "Nhân lực", "Phản hồi của tôi", "Thao tác"]} empty={!shifts.data.length}>{shifts.data.map((row) => <tr key={row.id}><td>{row.requestCode}<p className="text-text-muted">{row.productName}</p></td><td>{row.workDate}<p className="text-text-muted">Nhận: {row.pickupDate}</p></td><td>{row.cages}</td><td>{row.approvedEmployees}/{row.requiredEmployees}</td><td>{row.approved === null ? "Chưa phản hồi" : row.approved ? "Đồng ý" : "Từ chối"}</td><td><Button className="w-auto" variant="secondary" onClick={() => setSelected(row)}>{row.canRespond ? "Phản hồi ca" : "Xem ca"}</Button></td></tr>)}</DataTable>}
    {selected && <ShiftResponseEditor key={selected.id} record={selected} period={period} onClose={() => setSelected(undefined)} onSaved={() => { setSelected(undefined); shifts.reload(); }} />}
  </section>;
}
export function ShiftResponseEditor({ record, period, onClose, onSaved }: { record: Shift; period: { from: string; to: string }; onClose(): void; onSaved(): void }) {
  const [baseline, setBaseline] = useState(record), [mode, setMode] = useState("approve"), [reason, setReason] = useState(""), [latest, setLatest] = useState<Shift>(), [error, setError] = useState<string>();
  const editor = useOperationEditor(onClose, reason !== "" || mode !== "approve");
  async function save() {
    if (!baseline.canRespond) return;
    const payload = c.respondShiftSchema.safeParse({ approved: mode === "approve", reason: reason || null, rowVersion: baseline.rowVersion });
    if (!payload.success) { setError("Nhập lý do từ chối, tối đa 500 ký tự."); return; } setError(undefined);
    const saved = await editor.submit(`${mode === "approve" ? "Đồng ý" : "Từ chối"} ca ngày ${baseline.workDate} cho yêu cầu ${baseline.requestCode}? Phản hồi đã gửi không thể sửa.`, () => mine.write("respond-shift", payload.data, c.myPurchaseShiftSchema, baseline.id));
    if (saved) onSaved();
  }
  return <Dialog open title={`Ca ${record.requestCode}`} dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>{editor.dialog}
    <p>{baseline.productName} · {baseline.cages} lồng</p><p className="mt-2 text-sm">Ngày làm {baseline.workDate} · Ngày nhận {baseline.pickupDate}</p><p className="mt-2 text-sm">Đã đồng ý {baseline.approvedEmployees}/{baseline.requiredEmployees} người.</p><p className="mt-2 whitespace-pre-wrap text-sm">{baseline.note}</p>
    {!baseline.canRespond && <p className="mt-3 text-sm">{baseline.approved === null ? "Ca hiện không cho phép phản hồi." : `Bạn đã ${baseline.approved ? "đồng ý" : "từ chối"} ca. ${baseline.reason || ""}`}</p>}
    <ErrorNotice error={error || editor.mutation.error} />{baseline.canRespond && <form className="mt-4" onSubmit={(e) => { e.preventDefault(); void save(); }}><fieldset disabled={editor.disabled} className="space-y-4"><Select label="Phản hồi ca *" value={mode} onChange={(e) => setMode(e.target.value)}><option value="approve">Đồng ý</option><option value="decline">Từ chối</option></Select><Note label={mode === "decline" ? "Lý do từ chối *" : "Ghi chú phản hồi"} required={mode === "decline"} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /><Button type="submit">Gửi phản hồi ca</Button></fieldset></form>}
    {editor.mutation.blocked && <><p className="mt-3 text-sm">Giữ bản nháp; hãy đối chiếu lời mời mới trước khi tiếp tục.</p><Button className="mt-3" variant="secondary" disabled={editor.pending} onClick={async () => { const found = await editor.mutation.run(() => mine.read("purchase-shifts", period, z.array(c.myPurchaseShiftSchema)), true); const row = found?.find((r) => r.id === record.id); if (row) setLatest(row); }}>Tải lời mời mới để đối chiếu</Button></>}
    {latest && <div className="mt-3 rounded-control border border-border p-3 text-sm"><p>{latest.approved === null ? "Chưa phản hồi" : latest.approved ? "Đã đồng ý" : "Đã từ chối"} · {latest.approvedEmployees}/{latest.requiredEmployees} người.</p><p>{latest.reason}</p>{!editor.mutation.uncertain && <Button className="mt-2" variant="secondary" onClick={() => { setBaseline(latest); editor.mutation.reviewed(); setLatest(undefined); }}>Đã đối chiếu, giữ nháp</Button>}</div>}
    <Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
  </Dialog>;
}
