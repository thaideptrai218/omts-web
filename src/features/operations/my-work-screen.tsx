"use client";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { DataGrid } from "@/components/ui/data-grid";
import { StatusPill } from "@/components/ui/management-page";
import styles from "./my-work-screen.module.css";
import { Dialog } from "@/components/ui/dialog";
import { createOperationsRepository } from "./repository";
import * as c from "./new-module-contracts";
import { ErrorNotice, Field, Note, Paging, OperationHeading, Skeleton, businessToday, displayTime, useRemote } from "./ui";
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
  return <section>{editor.dialog}<OperationHeading title="Công việc và nghỉ phép" description="Xem lịch phân công, ngày công và các yêu cầu nghỉ phép của bạn." icon="calendar" />
    <FilterWorkspace label="Khoảng thời gian" filters={<><Field label="Từ ngày" type="date" required value={period.from} onChange={(e) => setPeriod({ ...period, from: e.target.value })} /><Field label="Đến ngày" type="date" required value={period.to} onChange={(e) => setPeriod({ ...period, to: e.target.value })} /><p className={styles.hint}>Khoảng ngày áp dụng cho phân công và ngày công; yêu cầu nghỉ phép hiển thị toàn bộ.</p><nav className={styles.jumpLinks} aria-label="Các mục công việc cá nhân">{work.data?.employeeId && <><a href="#my-assignments">Phân công</a><a href="#my-attendance">Ngày công</a><a href="#my-leave">Nghỉ phép</a></>}</nav></>}>
      <div className={styles.toolbar}><div><h2>{work.data?.name || "Lịch làm việc của bạn"}</h2><p>{dateLabel(period.from)} – {dateLabel(period.to)}</p></div><Button className="w-auto" variant="secondary" disabled={!valid || work.loading || editor.pending} onClick={work.reload}>Tải lại công việc cá nhân</Button></div>
      {!valid && <p role="alert" className="mt-3 text-danger">Chọn khoảng từ ngày đến ngày, tối đa 63 ngày.</p>}<ErrorNotice error={valid ? work.error || editor.mutation.error : undefined} />{notice && <p role="status" className={styles.notice}>{notice}</p>}
      {work.loading ? <Skeleton /> : work.data && (work.data.employeeId ? <>
        <section id="my-assignments" className={styles.section}><div className={styles.sectionHeading}><h2>Phân công của tôi</h2><span>{work.data.assignments.length} phân công trong kỳ</span></div>
          <PersonalTable key={`${period.from}:${period.to}`} rows={work.data.assignments} headings={["Ngày", "Bè", "Công việc", "Vào làm", "Ra về"]} renderRow={r => <tr key={r.id}><td data-label="Ngày" className={styles.date}>{dateLabel(r.date)}</td><td data-label="Bè">{r.raftCode || "—"}</td><td data-label="Công việc" className={styles.name}>{r.job}</td><td data-label="Vào làm">{r.checkedInAt ? displayTime(r.checkedInAt) : "Chưa ghi nhận"}</td><td data-label="Ra về">{r.checkedOutAt ? displayTime(r.checkedOutAt) : "Chưa ghi nhận"}</td></tr>} />
        </section>
        <section id="my-attendance" className={styles.section}><div className={styles.sectionHeading}><h2>Ngày công</h2><span>{work.data.attendance.length} ngày ghi nhận trong kỳ</span></div>
          <PersonalTable key={`${period.from}:${period.to}`} rows={work.data.attendance} headings={["Ngày", "Vào làm", "Ra về", "Công việc và số giờ", "Tình trạng"]} renderRow={r => <tr key={r.date}><td data-label="Ngày" className={styles.date}>{dateLabel(r.date)}</td><td data-label="Vào làm">{r.checkedInAt ? displayTime(r.checkedInAt) : "Chưa ghi nhận"}</td><td data-label="Ra về">{r.checkedOutAt ? displayTime(r.checkedOutAt) : "Chưa ghi nhận"}</td><td data-label="Công việc và số giờ">{r.jobs.map(j => <p key={j.jobTypeId}>{j.job}: {j.hours.toLocaleString("vi-VN")} giờ</p>)}</td><td data-label="Tình trạng"><StatusPill tone={r.complete ? "success" : "neutral"}>{r.complete ? "Đủ lượt vào/ra" : "Thiếu lượt vào/ra"}</StatusPill></td></tr>} />
        </section>
        <section id="my-leave" className={styles.section}><div className={styles.sectionHeading}><div><h2>Yêu cầu nghỉ phép của tôi</h2><p>Toàn bộ yêu cầu, không giới hạn theo khoảng ngày bên trái.</p></div><Button className="w-auto" disabled={editor.disabled} onClick={() => setCreating(true)}>Gửi yêu cầu nghỉ phép</Button></div>
          <PersonalTable rows={work.data.requests} headings={["Thời gian nghỉ", "Lý do", "Trạng thái", "Phản hồi", "Thao tác"]} renderRow={r => <tr key={r.id}><td data-label="Thời gian nghỉ" className={styles.date}>{dateLabel(r.from)}<small className={styles.meta}>đến {dateLabel(r.to)}</small></td><td data-label="Lý do" className={styles.longText}>{r.reason}</td><td data-label="Trạng thái"><StatusPill tone={!r.cancelledAt && r.approved === true ? "success" : "neutral"}>{r.cancelledAt ? "Đã hủy" : r.approved === null ? "Chờ duyệt" : r.approved ? "Đã duyệt" : "Từ chối"}</StatusPill></td><td data-label="Phản hồi" className={styles.longText}>{r.response || "—"}</td><td data-label="Thao tác">{r.approved === null && !r.cancelledAt && <Button className="w-auto" variant="secondary" disabled={editor.disabled} onClick={() => void cancel(r.id)}>Hủy nghỉ phép</Button>}</td></tr>} />
        </section>
      </> : <p className="mt-5">Chưa có hồ sơ nhân viên gắn với tài khoản này.</p>)}
    </FilterWorkspace>
    {editor.mutation.blocked && <p className="mt-3">Chưa rõ kết quả. Hãy đối chiếu trạng thái nghỉ phép hiện tại; hệ thống không tự hủy lại.</p>}
    {creating && <LeaveEditor onClose={() => setCreating(false)} onSaved={() => { setCreating(false); work.reload(); setNotice("Đã gửi yêu cầu nghỉ phép."); }} />}
  </section>;
}
function dateLabel(value: string) { return value ? value.split("-").reverse().join("/") : "—"; }
function PersonalTable<T>({ rows, headings, renderRow }: { rows: T[]; headings: string[]; renderRow(row: T): ReactNode }) {
  const [page, setPage] = useState(1);
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 10)));
  return <><DataGrid responsive headings={headings} empty={!rows.length}>{rows.slice((current - 1) * 10, current * 10).map(renderRow)}</DataGrid>{rows.length > 10 && <div className={styles.paging}><Paging page={current} pageSize={10} total={rows.length} onChange={setPage} /></div>}</>;
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
  return <Dialog open title="Gửi yêu cầu nghỉ phép" dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>{editor.dialog}<ErrorNotice error={error || editor.mutation.error} /><form className={styles.leaveForm} onSubmit={(e) => { e.preventDefault(); void save(); }}><fieldset disabled={editor.disabled} className="space-y-4"><Field label="Nghỉ từ ngày *" type="date" required value={values.from} onChange={(e) => setValues({ ...values, from: e.target.value })} /><Field label="Nghỉ đến ngày *" type="date" required min={values.from || undefined} value={values.to} onChange={(e) => setValues({ ...values, to: e.target.value })} /><Note label="Lý do nghỉ *" required maxLength={500} value={values.reason} onChange={(e) => setValues({ ...values, reason: e.target.value })} /><Button type="submit">Gửi nghỉ phép</Button></fieldset></form>
    {editor.mutation.blocked && <p className="mt-3">Bản nháp đang được giữ. Đối chiếu danh sách nghỉ phép trước khi lập lượt mới; không tự gửi lại.</p>}<Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
  </Dialog>;
}
