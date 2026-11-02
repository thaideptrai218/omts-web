"use client";
import { useMemo, useState } from "react";
import { useAuth } from "@/features/auth/state/auth-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DataTable, ErrorNotice, Field, Select, Skeleton, businessToday, displayTime, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { demoWorkforceService as service } from "./service";
import { demoJobs, type DemoAssignment } from "./repository";

type Workspace = Extract<Awaited<ReturnType<typeof service.load>>, { status: "success" }>["data"];
export function DemoWorkforceScreen() {
  const { state } = useAuth(), accountId = state.status === "authenticated" ? state.account.accountId : "";
  const [day, setDay] = useState(businessToday), [zone, setZone] = useState(""), [search, setSearch] = useState(""), [editing, setEditing] = useState(false), [notice, setNotice] = useState<string>();
  const workspace = useRemote(useMemo(() => () => service.load(accountId, day), [accountId, day]));
  const editor = useOperationEditor(() => {}, false), data = workspace.data;
  const term = search.trim().toLocaleLowerCase("vi");
  const rows = data?.assignments.filter((row) => (!zone || row.zoneId === zone) && (!term || `${row.employeeName} ${row.job}`.toLocaleLowerCase("vi").includes(term)));
  async function act(row: DemoAssignment, action: "remove" | "check-in" | "check-out") {
    const verb = action === "remove" ? "Gỡ phân công" : action === "check-in" ? "Ghi vào làm" : "Ghi ra về";
    const done = await editor.submit(`${verb} cho ${row.employeeName}${action === "check-out" && !row.checkedInAt ? " (chưa có lượt vào làm)" : ""}?`, () => service.act(accountId, row.id, row.version, action));
    if (done) { setNotice("Đã lưu vào dữ liệu thử local."); workspace.reload(); }
  }
  return <section>{editor.dialog}<h1 className="text-3xl font-semibold">Phân công và chấm công</h1>
    <p className="mt-3 rounded-control border border-border p-3 text-sm">Chế độ thử local · Dữ liệu mẫu dùng chung với danh sách nhân viên, vùng và bè. Phân công/chấm công sẽ khởi tạo lại khi tải lại trang.</p>
    <div className="my-4 flex flex-wrap gap-3"><Button className="w-auto" disabled={!data || editor.disabled} onClick={() => setEditing(true)}>Phân công công việc</Button><Button className="w-auto" variant="secondary" disabled={workspace.loading || editor.pending} onClick={workspace.reload}>Tải lại phân công</Button></div>
    <div className="grid gap-3 sm:grid-cols-3"><Field label="Ngày làm việc" type="date" required value={day} onChange={(event) => setDay(event.target.value)} /><Select label="Vùng làm việc" value={zone} onChange={(event) => setZone(event.target.value)}><option value="">Tất cả vùng được cấp</option>{data?.zones.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select><Field label="Tìm nhân viên hoặc công việc" type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    <ErrorNotice error={workspace.error || editor.mutation.error} />{notice && <p role="status" className="mt-3">{notice}</p>}
    {workspace.loading ? <Skeleton /> : data && <><p className="mt-4">{rows?.length ?? 0} phân công</p><DataTable headings={["Nhân viên", "Vùng", "Bè", "Công việc", "Ngày", "Vào làm", "Ra về", "Thao tác"]} empty={!rows?.length}>{rows?.map((row) => <tr key={row.id}><td>{row.employeeName}</td><td>{data.zones.find((item) => item.id === row.zoneId)?.label}</td><td>{data.rafts.find((item) => item.id === row.raftId)?.code ?? "—"}</td><td>{row.job}</td><td>{row.date}</td><td>{row.checkedInAt ? displayTime(row.checkedInAt) : "Chưa ghi nhận"}</td><td>{row.checkedOutAt ? displayTime(row.checkedOutAt) : "Chưa ghi nhận"}</td><td><div className="flex flex-wrap gap-2">
      {row.date >= businessToday() && !row.checkedInAt && !row.checkedOutAt && <Button className="w-auto" variant="secondary" disabled={editor.disabled} onClick={() => void act(row, "remove")}>Gỡ phân công</Button>}
      {row.date === businessToday() && !row.checkedOutAt && <>{!row.checkedInAt && <Button className="w-auto" disabled={editor.disabled} onClick={() => void act(row, "check-in")}>Vào làm</Button>}<Button className="w-auto" variant="secondary" disabled={editor.disabled} onClick={() => void act(row, "check-out")}>Ra về</Button></>}
    </div></td></tr>)}</DataTable></>}
    {editing && data && <DemoAssignmentEditor accountId={accountId} data={data} day={day} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setNotice("Đã lưu phân công vào dữ liệu thử local."); workspace.reload(); }} />}
  </section>;
}
function DemoAssignmentEditor({ accountId, data, day, onClose, onSaved }: { accountId: string; data: Workspace; day: string; onClose(): void; onSaved(): void }) {
  const initialDate = day < businessToday() ? businessToday() : day;
  const [zoneId, setZoneId] = useState(""), [raftId, setRaftId] = useState(""), [job, setJob] = useState<string>(demoJobs[0]), [date, setDate] = useState(day < businessToday() ? businessToday() : day), [employeeIds, setEmployeeIds] = useState<string[]>([]), [error, setError] = useState<string>();
  const editor = useOperationEditor(onClose, !!zoneId || !!raftId || !!employeeIds.length || job !== demoJobs[0] || date !== initialDate);
  const employees = data.employees.filter((employee) => employee.zoneIds.includes(zoneId));
  async function save() {
    if (!zoneId || !raftId || !employeeIds.length || date < businessToday()) { setError("Chọn vùng, bè, ngày hợp lệ và ít nhất một nhân viên."); return; }
    setError(undefined);
    const done = await editor.submit(`Phân công ${employeeIds.length} nhân viên làm ${job}, ngày ${date}, bè ${data.rafts.find((raft) => raft.id === raftId)?.code}?`, () => service.assign(accountId, { raftId, job, date, employeeIds }));
    if (done) onSaved();
  }
  return <Dialog open title="Phân công công việc" size="lg" dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>{editor.dialog}<ErrorNotice error={error || editor.mutation.error} /><form onSubmit={(event) => { event.preventDefault(); void save(); }}><fieldset disabled={editor.disabled} className="space-y-4">
    <Field label="Ngày phân công *" type="date" required min={businessToday()} value={date} onChange={(event) => setDate(event.target.value)} />
    <Select label="Vùng phân công *" required value={zoneId} onChange={(event) => { setZoneId(event.target.value); setRaftId(""); setEmployeeIds([]); }}><option value="">Chọn vùng</option>{data.zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.label}</option>)}</Select>
    <Select label="Bè phân công *" required value={raftId} onChange={(event) => setRaftId(event.target.value)}><option value="">Chọn bè</option>{data.rafts.filter((raft) => raft.zoneId === zoneId).map((raft) => <option key={raft.id} value={raft.id}>{raft.code}</option>)}</Select>
    <Select label="Công việc *" required value={job} onChange={(event) => setJob(event.target.value)}>{demoJobs.map((value) => <option key={value}>{value}</option>)}</Select>
    <fieldset className="rounded-control border border-border p-3"><legend>Nhân viên được phân công</legend>{employees.map((employee) => <label key={employee.id} className="flex gap-3 py-2"><input type="checkbox" checked={employeeIds.includes(employee.id)} onChange={(event) => setEmployeeIds((ids) => event.target.checked ? [...ids, employee.id] : ids.filter((id) => id !== employee.id))} />{employee.name}</label>)}{!employees.length && <p>{zoneId ? "Chưa có nhân viên đang làm việc tại vùng này." : "Chọn vùng để xem nhân viên."}</p>}</fieldset>
    <Button type="submit">Lưu phân công</Button></fieldset></form><Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button></Dialog>;
}
