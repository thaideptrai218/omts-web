"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { createOperationsRepository } from "./repository";
import * as c from "./new-module-contracts";
import { DataTable, ErrorNotice, Field, Note, Skeleton, businessToday, displayTime, useRemote } from "./ui";
import { useOperationEditor } from "./use-operation-editor";

const repository = createOperationsRepository("my-work");
export function MyWorkScreen() {
  const [period, setPeriod] = useState(() => ({ from: businessToday().slice(0, 8) + "01", to: businessToday() })), [creating, setCreating] = useState(false), [notice, setNotice] = useState<string>();
  const valid = !!period.from && !!period.to && period.to >= period.from && Date.parse(period.to) - Date.parse(period.from) <= 62 * 86_400_000;
  const work = useRemote(useMemo(() => (signal: AbortSignal) => valid ? repository.read("list", period, c.myWorkSchema, signal) : Promise.resolve({ status: "error" as const, httpStatus: 400, uncertain: false }), [valid, period]));
  const editor = useOperationEditor(() => {}, false);
  async function cancel(id: string) {
    const result = await editor.submit("Hủy yêu cầu nghỉ phép đang chờ duyệt?", () => repository.write("cancel-leave", {}, c.leaveSchema, id));
    if (result) { work.reload(); setNotice("Đã hủy yêu cầu nghỉ phép."); }
  }
  return <section>{editor.dialog}<h1 className="text-3xl font-semibold">Công việc và nghỉ phép của tôi</h1><p className="mt-3 text-sm text-text-muted">Khoảng ngày áp dụng cho phân công và ngày công; yêu cầu nghỉ phép hiển thị toàn bộ.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Từ ngày" type="date" required value={period.from} onChange={(e) => setPeriod({ ...period, from: e.target.value })} /><Field label="Đến ngày" type="date" required value={period.to} onChange={(e) => setPeriod({ ...period, to: e.target.value })} /></div>
    {!valid && <p role="alert" className="mt-3 text-danger">Chọn khoảng từ ngày đến ngày, tối đa 63 ngày.</p>}<Button className="mt-4 w-auto" variant="secondary" disabled={!valid || work.loading || editor.pending} onClick={work.reload}>Tải lại công việc cá nhân</Button><ErrorNotice error={valid ? work.error || editor.mutation.error : undefined} />{notice && <p role="status" className="mt-3">{notice}</p>}
    {work.loading ? <Skeleton /> : work.data && (work.data.employeeId ? <><p className="mt-4">Nhân viên: {work.data.name}</p><h2 className="mt-6 text-xl font-semibold">Phân công của tôi</h2><DataTable headings={["Ngày", "Bè", "Công việc", "Vào làm", "Ra về"]} empty={!work.data.assignments.length}>{work.data.assignments.map((r) => <tr key={r.id}><td>{r.date}</td><td>{r.raftCode || "—"}</td><td>{r.job}</td><td>{r.checkedInAt ? displayTime(r.checkedInAt) : "Chưa ghi nhận"}</td><td>{r.checkedOutAt ? displayTime(r.checkedOutAt) : "Chưa ghi nhận"}</td></tr>)}</DataTable>
      <h2 className="mt-6 text-xl font-semibold">Ngày công</h2><DataTable headings={["Ngày", "Vào làm", "Ra về", "Công việc và số giờ", "Tình trạng"]} empty={!work.data.attendance.length}>{work.data.attendance.map((r) => <tr key={r.date}><td>{r.date}</td><td>{r.checkedInAt ? displayTime(r.checkedInAt) : "Chưa ghi nhận"}</td><td>{r.checkedOutAt ? displayTime(r.checkedOutAt) : "Chưa ghi nhận"}</td><td>{r.jobs.map((j) => <p key={j.jobTypeId}>{j.job}: {j.hours.toLocaleString("vi-VN")} giờ</p>)}</td><td>{r.complete ? "Đủ lượt vào/ra" : "Thiếu lượt vào/ra"}</td></tr>)}</DataTable>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Yêu cầu nghỉ phép của tôi</h2><Button className="w-auto" disabled={editor.disabled} onClick={() => setCreating(true)}>Gửi yêu cầu nghỉ phép</Button></div><DataTable headings={["Từ", "Đến", "Lý do", "Trạng thái", "Phản hồi", "Thao tác"]} empty={!work.data.requests.length}>{work.data.requests.map((r) => <tr key={r.id}><td>{r.from}</td><td>{r.to}</td><td className="whitespace-pre-wrap">{r.reason}</td><td>{r.cancelledAt ? "Đã hủy" : r.approved === null ? "Chờ duyệt" : r.approved ? "Đã duyệt" : "Từ chối"}</td><td>{r.response || "—"}</td><td>{r.approved === null && !r.cancelledAt && <Button className="w-auto" variant="secondary" disabled={editor.disabled} onClick={() => void cancel(r.id)}>Hủy nghỉ phép</Button>}</td></tr>)}</DataTable>
    </> : <p className="mt-5">Chưa có hồ sơ nhân viên gắn với tài khoản này.</p>)}
    {editor.mutation.blocked && <p className="mt-3">Chưa rõ kết quả. Hãy đối chiếu trạng thái nghỉ phép hiện tại; hệ thống không tự hủy lại.</p>}
    {creating && <LeaveEditor onClose={() => setCreating(false)} onSaved={() => { setCreating(false); work.reload(); setNotice("Đã gửi yêu cầu nghỉ phép."); }} />}
  </section>;
}
export function LeaveEditor({ onClose, onSaved }: { onClose(): void; onSaved(): void }) {
  const [values, setValues] = useState(() => ({ from: businessToday(), to: businessToday(), reason: "" })), [error, setError] = useState<string>();
  const [initial] = useState(() => JSON.stringify(values)), [clientOperationId] = useState(() => crypto.randomUUID()), editor = useOperationEditor(onClose, JSON.stringify(values) !== initial);
  async function save() {
    const payload = c.requestLeaveSchema.safeParse({ ...values, clientOperationId });
    if (!payload.success) { setError("Chọn khoảng ngày hợp lệ và nhập lý do nghỉ (tối đa 500 ký tự)."); return; }
    setError(undefined);
    const result = await editor.submit(`Gửi yêu cầu nghỉ từ ${values.from} đến ${values.to}?`, () => repository.write("leave", payload.data, c.leaveSchema));
    if (result) onSaved();
  }
  return <Dialog open title="Gửi yêu cầu nghỉ phép" dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>{editor.dialog}<ErrorNotice error={error || editor.mutation.error} /><form onSubmit={(e) => { e.preventDefault(); void save(); }}><fieldset disabled={editor.disabled} className="space-y-4"><Field label="Nghỉ từ ngày *" type="date" required value={values.from} onChange={(e) => setValues({ ...values, from: e.target.value })} /><Field label="Nghỉ đến ngày *" type="date" required min={values.from || undefined} value={values.to} onChange={(e) => setValues({ ...values, to: e.target.value })} /><Note label="Lý do nghỉ *" required maxLength={500} value={values.reason} onChange={(e) => setValues({ ...values, reason: e.target.value })} /><Button type="submit">Gửi nghỉ phép</Button></fieldset></form>
    {editor.mutation.blocked && <p className="mt-3">Bản nháp đang được giữ. Đối chiếu danh sách nghỉ phép trước khi lập lượt mới; không tự gửi lại.</p>}<Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
  </Dialog>;
}
