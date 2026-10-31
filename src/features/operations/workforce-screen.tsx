"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { createOperationsRepository } from "./repository";
import { loadOptions } from "./lookups";
import { operationAllowed } from "./permissions";
import * as c from "./new-module-contracts";
import { DataTable, ErrorNotice, Field, Note, Select, businessToday, displayTime, useRemote, Skeleton } from "./ui";
import { useOperationEditor } from "./use-operation-editor";

const repository = createOperationsRepository("workforce");
type Assignment = z.infer<typeof c.assignmentSchema>;
export function WorkforceScreen() {
  const context = useApiWorkspace(), [day, setDay] = useState(businessToday), [form, setForm] = useState<"assign" | "crew" | "job" | "settings" | "leaves">(), [notice, setNotice] = useState<string>();
  const rows = useRemote(useMemo(() => (signal: AbortSignal) => day ? repository.read("list", { day }, z.array(c.assignmentSchema), signal) : Promise.resolve({ status: "success" as const, data: [] }), [day]));
  const editor = useOperationEditor(() => {}, false);
  const allowed = (action: string, zoneId?: string) => operationAllowed("workforce", context.identity, context.permissions.functionPermissions, action, zoneId);
  async function act(row: Assignment, action: "remove" | "check-in" | "check-out") {
    const result = await editor.submit(action === "remove" ? `Gỡ phân công của ${row.employeeName} ngày ${row.date}?` : `Ghi ${action === "check-in" ? "vào làm" : "ra về"} cho ${row.employeeName} lúc hiện tại${action === "check-out" && !row.checkedInAt ? "; chưa có lượt vào làm, ngày công sẽ thiếu lượt" : ""}?`,
      () => repository.write<unknown>(action, action === "remove" ? {} : { qrCode: null }, action === "remove" ? z.object({ done: z.literal(true) }) : c.assignmentSchema, row.id, row.zoneId));
    if (result) { setNotice("Đã ghi nhận thao tác."); rows.reload(); }
  }
  return <section>{editor.dialog}<h1 className="text-3xl font-semibold">Phân công và chấm công</h1><div className="mt-4 flex flex-wrap gap-2">
    {allowed("Create") && <Button className="w-auto" disabled={editor.disabled} onClick={() => setForm("assign")}>Phân công công việc</Button>}
    {allowed("Edit") && <Button className="w-auto" disabled={editor.disabled} onClick={() => setForm("crew")}>Đổi việc trong ngày</Button>}
    {context.identity.subjectType === "CooperativeOwner" && <>{(["job", "settings", "leaves"] as const).map((key) => <Button key={key} className="w-auto" variant="secondary" disabled={editor.disabled} onClick={() => setForm(key)}>{key === "job" ? "Thêm loại công việc" : key === "settings" ? "Thiết lập chấm công" : "Duyệt nghỉ phép"}</Button>)}</>}
    </div><div className="mt-5 max-w-md"><Field label="Ngày làm việc" type="date" required value={day} onChange={(e) => setDay(e.target.value)} /></div>
    <Button className="mt-4 w-auto" variant="secondary" disabled={rows.loading || !day || editor.pending} onClick={rows.reload}>Tải lại phân công</Button><ErrorNotice error={rows.error || editor.mutation.error} />{notice && <p role="status" className="mt-3">{notice}</p>}
    {editor.mutation.blocked && <p className="mt-3">Chưa thể gửi tiếp. Hãy đối chiếu phân công và chấm công hiện tại trước khi lập lượt mới; tải lại không tự gửi lại thao tác.</p>}
    {rows.loading ? <Skeleton /> : rows.data && <DataTable headings={["Nhân viên", "Bè", "Công việc", "Ngày", "Vào làm", "Ra về", "Thao tác"]} empty={!rows.data.length}>{rows.data.map((row) => <tr key={row.id}><td>{row.employeeName}</td><td>{row.raftCode || "—"}</td><td>{row.job}</td><td>{row.date}</td><td>{row.checkedInAt ? displayTime(row.checkedInAt) : "Chưa ghi nhận"}</td><td>{row.checkedOutAt ? displayTime(row.checkedOutAt) : "Chưa ghi nhận"}</td><td><div className="flex flex-wrap gap-2">
      {row.date >= businessToday() && !row.checkedInAt && !row.checkedOutAt && allowed("Delete", row.zoneId) && <Button className="w-auto" variant="secondary" disabled={editor.disabled} onClick={() => void act(row, "remove")}>Gỡ phân công</Button>}
      {row.date === businessToday() && allowed("AttendanceCreate", row.zoneId) && <>{!row.checkedInAt && !row.checkedOutAt && row.jobTypeId && row.raftId && <Button className="w-auto" disabled={editor.disabled} onClick={() => void act(row, "check-in")}>Vào làm</Button>}{!row.checkedOutAt && <Button className="w-auto" variant="secondary" disabled={editor.disabled} onClick={() => void act(row, "check-out")}>Ra về</Button>}</>}
    </div></td></tr>)}</DataTable>}
    {(form === "assign" || form === "crew") && <AssignmentEditor mode={form} initialDay={day || businessToday()} onClose={() => setForm(undefined)} onSaved={() => { setForm(undefined); rows.reload(); setNotice("Đã lưu phân công."); }} />}
    {(form === "job" || form === "settings") && <WorkforceSetup mode={form} onClose={() => setForm(undefined)} />}
    {form === "leaves" && <OwnerLeaves onClose={() => setForm(undefined)} />}
  </section>;
}

export function AssignmentEditor({ mode, initialDay, onClose, onSaved }: { mode: "assign" | "crew"; initialDay: string; onClose(): void; onSaved(): void }) {
  const context = useApiWorkspace(), [values, setValues] = useState({ zoneId: "", raftId: "", jobTypeId: "", date: mode === "crew" ? businessToday() : initialDay < businessToday() ? businessToday() : initialDay, moveExisting: false }), [employeeIds, setEmployeeIds] = useState<string[]>([]), [error, setError] = useState<string>();
  const [initial] = useState(() => JSON.stringify(values));
  const editor = useOperationEditor(onClose, JSON.stringify(values) !== initial || employeeIds.length > 0);
  const options = useRemote(useMemo(() => (signal: AbortSignal) => repository.read("lookups", { day: values.date }, c.workforceLookupsSchema, signal), [values.date]));
  const zones = useRemote(useMemo(() => (signal: AbortSignal) => loadOptions("zones", signal), []));
  const rafts = useRemote(useMemo(() => (signal: AbortSignal) => values.zoneId ? loadOptions("rafts", signal, { zoneId: values.zoneId, statusId: "101" }) : Promise.resolve({ status: "success" as const, data: [] }), [values.zoneId]));
  const allowedZones = zones.data?.filter((zone) => zone.statusId === 101 && operationAllowed("workforce", context.identity, context.permissions.functionPermissions, mode === "assign" ? "Create" : "Edit", zone.id));
  async function save() {
    const payload = mode === "assign" ? c.assignWorkSchema.safeParse({ raftId: values.raftId, jobTypeId: values.jobTypeId, date: values.date, employeeIds, moveExisting: values.moveExisting }) : c.crewWorkSchema.safeParse({ raftId: values.raftId, jobTypeId: values.jobTypeId, employeeIds });
    if (!payload.success || !values.zoneId || mode === "assign" && values.date < businessToday()) { setError("Chọn vùng, bè, công việc, ngày hợp lệ và ít nhất một nhân viên (tối đa 100)."); return; }
    setError(undefined);
    const result = await editor.submit(`${mode === "assign" ? "Phân công" : "Đổi việc cho"} ${employeeIds.length} nhân viên, ngày ${values.date}, bè ${String(rafts.data?.find((r) => r.id === values.raftId)?.code ?? "đã chọn")}, ${options.data?.jobs.find((r) => r.id === values.jobTypeId)?.name ?? "công việc đã chọn"}${values.moveExisting ? "; chuyển phân công đã có" : ""}?`, () => repository.write<unknown>(mode === "assign" ? "assign" : "crew", payload.data, mode === "assign" ? z.array(c.assignmentSchema) : z.object({ done: z.literal(true) }), undefined, values.zoneId));
    if (result) onSaved();
  }
  return <Dialog open size="lg" title={mode === "assign" ? "Phân công công việc" : "Đổi việc trong ngày"} dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>{editor.dialog}<ErrorNotice error={error || editor.mutation.error || options.error || zones.error || rafts.error} />
    <Button variant="secondary" disabled={editor.pending || options.loading || zones.loading || rafts.loading} onClick={() => { options.reload(); zones.reload(); if (values.zoneId) rafts.reload(); }}>Tải lại danh mục phân công</Button>
    <form className="mt-4" onSubmit={(e) => { e.preventDefault(); void save(); }}><fieldset disabled={editor.disabled} className="space-y-4">
      {mode === "crew" && <p>Ngày đổi việc: {values.date}</p>}{mode === "assign" && <Field label="Ngày phân công *" type="date" min={businessToday()} required value={values.date} onChange={(e) => setValues({ ...values, date: e.target.value })} />}
      <Select label="Vùng phân công *" required value={values.zoneId} onChange={(e) => setValues({ ...values, zoneId: e.target.value, raftId: "" })}><option value="">Chọn vùng</option>{allowedZones?.map((r) => <option key={r.id} value={r.id}>{String(r.name)}</option>)}</Select>
      <Select label="Bè làm việc *" required value={values.raftId} onChange={(e) => setValues({ ...values, raftId: e.target.value })}><option value="">Chọn bè</option>{rafts.data?.map((r) => <option key={r.id} value={r.id}>{String(r.code)}</option>)}</Select>
      <Select label="Loại công việc *" required value={values.jobTypeId} onChange={(e) => setValues({ ...values, jobTypeId: e.target.value })}><option value="">Chọn công việc</option>{options.data?.jobs.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
      <fieldset className="max-h-64 overflow-auto rounded-control border border-border p-3"><legend>Nhân viên được phân công</legend>{options.data?.employees.map((r) => <label key={r.id} className="flex gap-3 py-2"><input type="checkbox" checked={employeeIds.includes(r.id)} onChange={(e) => setEmployeeIds((ids) => e.target.checked ? [...ids, r.id] : ids.filter((id) => id !== r.id))} />{r.name}{r.onLeave && " · Đã duyệt nghỉ ngày này"}</label>)}{options.data && !options.data.employees.length && <p>Chưa có nhân viên đang làm việc.</p>}</fieldset>
      {mode === "assign" && <label className="flex gap-3"><input type="checkbox" checked={values.moveExisting} onChange={(e) => setValues({ ...values, moveExisting: e.target.checked })} />Chuyển phân công đã có của các nhân viên được chọn</label>}
      <Button type="submit" disabled={options.loading || zones.loading || rafts.loading}>{mode === "assign" ? "Lưu phân công" : "Lưu đổi việc"}</Button></fieldset></form>
    {editor.mutation.blocked && <p className="mt-3">Bản nháp đang được giữ; đối chiếu bảng phân công trước khi lập lượt mới.</p>}<Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
  </Dialog>;
}

function WorkforceSetup({ mode, onClose }: { mode: "job" | "settings"; onClose(): void }) {
  const [values, setValues] = useState({ name: "", effectiveFrom: businessToday(), breakFrom: "", breakTo: "", roundingMinutes: "0" }), [error, setError] = useState<string>(), [notice, setNotice] = useState<string>();
  const [initial, setInitial] = useState(() => JSON.stringify(values)), editor = useOperationEditor(onClose, JSON.stringify(values) !== initial);
  const settings = useRemote(useMemo(() => (signal: AbortSignal) => mode === "settings" ? repository.read("settings", {}, z.array(c.attendanceSettingsSchema), signal) : Promise.resolve({ status: "success" as const, data: [] }), [mode]));
  async function save() {
    const payload = mode === "job" ? z.strictObject({ name: z.string().trim().min(1).max(200) }).safeParse({ name: values.name }) : c.saveAttendanceSettingsSchema.safeParse({ effectiveFrom: values.effectiveFrom, breakFrom: values.breakFrom || null, breakTo: values.breakTo || null, roundingMinutes: Number(values.roundingMinutes) });
    if (!payload.success) { setError("Kiểm tra tên công việc hoặc ngày hiệu lực, khoảng nghỉ và mức làm tròn."); return; }
    setError(undefined);
    const result = await editor.submit(mode === "job" ? `Thêm loại công việc ${values.name}?` : `Lưu thiết lập từ ${values.effectiveFrom}, nghỉ ${values.breakFrom || "không có"} đến ${values.breakTo || "không có"}, làm tròn ${values.roundingMinutes} phút?`, () => repository.write<unknown>(mode, payload.data, mode === "job" ? z.object({ id: z.guid(), name: z.string() }) : c.attendanceSettingsSchema));
    if (result) { if (mode === "job") onClose(); else { setInitial(JSON.stringify(values)); setNotice("Đã lưu thiết lập chấm công."); settings.reload(); } }
  }
  return <Dialog open title={mode === "job" ? "Thêm loại công việc" : "Thiết lập chấm công"} dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>{editor.dialog}<ErrorNotice error={error || editor.mutation.error || settings.error} />{notice && <p role="status">{notice}</p>}
    {mode === "settings" && <><Button variant="secondary" disabled={settings.loading || editor.pending} onClick={settings.reload}>Tải lại thiết lập</Button>{settings.data && <DataTable headings={["Hiệu lực", "Nghỉ từ", "Nghỉ đến", "Làm tròn (phút)"]} empty={!settings.data.length}>{settings.data.map((r) => <tr key={r.id}><td>{r.effectiveFrom}</td><td>{r.breakFrom || "—"}</td><td>{r.breakTo || "—"}</td><td>{r.roundingMinutes}</td></tr>)}</DataTable>}</>}
    <form onSubmit={(e) => { e.preventDefault(); void save(); }}><fieldset disabled={editor.disabled} className="space-y-4">{mode === "job" ? <Field label="Tên công việc *" required maxLength={200} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} /> : <><Field label="Ngày hiệu lực *" type="date" required value={values.effectiveFrom} onChange={(e) => setValues({ ...values, effectiveFrom: e.target.value })} /><Field label="Nghỉ từ" type="time" value={values.breakFrom} onChange={(e) => setValues({ ...values, breakFrom: e.target.value })} /><Field label="Nghỉ đến" type="time" value={values.breakTo} onChange={(e) => setValues({ ...values, breakTo: e.target.value })} /><Select label="Làm tròn (phút)" value={values.roundingMinutes} onChange={(e) => setValues({ ...values, roundingMinutes: e.target.value })}>{[0, 15, 30, 60].map((v) => <option key={v} value={v}>{v}</option>)}</Select></>}
      <Button type="submit">{mode === "job" ? "Thêm công việc" : "Lưu thiết lập"}</Button></fieldset></form><Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
  </Dialog>;
}

function OwnerLeaves({ onClose }: { onClose(): void }) {
  const rows = useRemote(useMemo(() => (signal: AbortSignal) => repository.read("leaves", {}, z.array(c.leaveSchema), signal), []));
  const [selected, setSelected] = useState<z.infer<typeof c.leaveSchema>>();
  return <Dialog open size="lg" title="Duyệt nghỉ phép" onOpenChange={(open) => { if (!open) onClose(); }}><ErrorNotice error={rows.error} /><Button variant="secondary" disabled={rows.loading} onClick={rows.reload}>Tải lại yêu cầu nghỉ</Button>
    {rows.loading ? <Skeleton /> : rows.data && <DataTable headings={["Nhân viên", "Từ", "Đến", "Lý do", "Trạng thái", "Phản hồi", "Thao tác"]} empty={!rows.data.length}>{rows.data.map((r) => <tr key={r.id}><td>{r.employeeName}</td><td>{r.from}</td><td>{r.to}</td><td>{r.reason}</td><td>{r.cancelledAt ? "Đã hủy" : r.approved === null ? "Chờ duyệt" : r.approved ? "Đã duyệt" : "Từ chối"}</td><td>{r.response || "—"}</td><td>{r.approved === null && !r.cancelledAt && <button className="text-primary underline" onClick={() => setSelected(r)}>Phản hồi nghỉ phép</button>}</td></tr>)}</DataTable>}
    {selected && <ReviewLeave key={selected.id} record={selected} onClose={() => setSelected(undefined)} onSaved={() => { setSelected(undefined); rows.reload(); }} />}<Button className="mt-4" variant="secondary" onClick={onClose}>Đóng</Button>
  </Dialog>;
}
export function ReviewLeave({ record, onClose, onSaved }: { record: z.infer<typeof c.leaveSchema>; onClose(): void; onSaved(): void }) {
  const [approved, setApproved] = useState(true), [response, setResponse] = useState(""), [error, setError] = useState<string>();
  const editor = useOperationEditor(onClose, !approved || !!response);
  async function save() {
    const payload = c.reviewLeaveSchema.safeParse({ approved, response, rowVersion: record.rowVersion });
    if (!payload.success) { setError("Nhập lý do khi từ chối nghỉ phép (tối đa 500 ký tự)."); return; }
    const result = await editor.submit(`${approved ? "Duyệt" : "Từ chối"} nghỉ phép của ${record.employeeName}, ${record.from} đến ${record.to}?`, () => repository.write("review-leave", payload.data, c.leaveSchema, record.id));
    if (result) onSaved();
  }
  return <Dialog open title={`Nghỉ phép · ${record.employeeName}`} dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>{editor.dialog}<p>{record.from} — {record.to} · {record.reason}</p><ErrorNotice error={error || editor.mutation.error} />
    <form onSubmit={(e) => { e.preventDefault(); void save(); }}><fieldset disabled={editor.disabled} className="space-y-4"><Select label="Quyết định nghỉ phép" value={approved ? "yes" : "no"} onChange={(e) => setApproved(e.target.value === "yes")}><option value="yes">Duyệt</option><option value="no">Từ chối</option></Select><Note label={approved ? "Phản hồi" : "Lý do từ chối *"} required={!approved} maxLength={500} value={response} onChange={(e) => setResponse(e.target.value)} /><Button type="submit">Lưu quyết định</Button></fieldset></form>
    {editor.mutation.blocked && <p className="mt-3">Bản nháp đang được giữ. Đóng sau khi đối chiếu rồi mở lại yêu cầu mới; không tự gửi lại quyết định.</p>}<Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
  </Dialog>;
}
