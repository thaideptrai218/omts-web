"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import { ErrorNotice, Select, Skeleton, businessToday, useMutation, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { assignmentLabel, cellRights, emptyCellMessage, type ScheduleAccess, type ScheduleCell } from "./schedule-model";
import { ScheduleHelp } from "./schedule-help";
import { scheduleService } from "./schedule-service";

export function ScheduleCellDialog({ cell, zoneId, allowed, onClose, onSaved }: {
  cell: ScheduleCell; zoneId: string; allowed: ScheduleAccess; onClose(): void; onSaved(): void;
}) {
  const rights = cellRights(cell, zoneId, businessToday(), allowed);
  return <CellEditor key={`${cell.person.id}:${cell.day}`} cell={cell} zoneId={zoneId} allowed={allowed} rights={rights} onClose={onClose} onSaved={onSaved} />;
}

function CellEditor({ cell, zoneId, allowed, rights, onClose, onSaved }: {
  cell: ScheduleCell; zoneId: string; allowed: ScheduleAccess; rights: ReturnType<typeof cellRights>; onClose(): void; onSaved(): void;
}) {
  const row = cell.assignments[0];
  const emptyMessage = emptyCellMessage(cell, businessToday(), rights.save);
  const [jobTypeId, setJobTypeId] = useState(row?.jobTypeId || "");
  const [raftId, setRaftId] = useState(row?.raftId || "");
  const [removing, setRemoving] = useState(false), [closing, setClosing] = useState(false);
  const [error, setError] = useState<string>();
  const mutation = useMutation(), { notify } = useToast();
  const dirty = jobTypeId !== (row?.jobTypeId || "") || raftId !== (row?.raftId || "");
  const lookups = useRemote(useMemo(() => (signal: AbortSignal) => rights.save ? scheduleService.lookups(cell.day, signal)
    : Promise.resolve({ status: "success" as const, data: { employees: [], jobs: [] } }), [cell.day, rights.save]));
  const rafts = useRemote(useMemo(() => (signal: AbortSignal) => rights.save ? scheduleService.rafts(zoneId, signal)
    : Promise.resolve({ status: "success" as const, data: [] }), [zoneId, rights.save]));

  function close() {
    if (mutation.pending) return;
    if (dirty || mutation.blocked) setClosing(true); else onClose();
  }

  async function save() {
    if (!cellRights(cell, zoneId, businessToday(), allowed).save) return;
    if (!lookups.data?.jobs.some((job) => job.id === jobTypeId)) { setError("Chọn loại công việc hợp lệ."); return; }
    setError(undefined);
    const draft = { employeeId: cell.person.id, zoneId, raftId, jobTypeId, day: cell.day };
    // Both endpoints signal success, but return different payloads (crew: done; assign: rows).
    const result = await mutation.run<unknown>(() => row && cell.day === businessToday() ? scheduleService.changeToday(draft) : scheduleService.create(draft, !!row));
    if (result !== undefined) {
      notify({ tone: "success", title: `Đã lưu phân công của ${cell.person.name}.` });
      onSaved();
    }
  }

  async function remove() {
    if (!row || !cellRights(cell, zoneId, businessToday(), allowed).remove) return;
    const result = await mutation.run(() => scheduleService.remove(row.id, zoneId));
    if (result !== undefined) {
      notify({ tone: "success", title: `Đã gỡ phân công của ${cell.person.name}.` });
      onSaved();
    }
  }

  return <Dialog open title={`Phân công · ${cell.person.name}`} description={formatVietnameseDate(cell.day)} dismissible={!mutation.pending}
    onCloseRequest={mutation.pending ? undefined : close} onOpenChange={(open) => { if (!open) close(); }}>
    <ScheduleHelp>Chọn công việc và bè, hoặc để trống bè để giao việc cấp vùng. Ngày đã qua chỉ xem. Gỡ phân công cần xác nhận.</ScheduleHelp>
    <ErrorNotice error={error || mutation.error || lookups.error || rafts.error} />
    {(lookups.error || rafts.error) && <Button variant="secondary" onClick={() => { lookups.reload(); rafts.reload(); }}>Thử lại danh mục</Button>}
    {cell.day < businessToday() && !!row && <p className="mb-3 text-sm text-text-muted">Ngày đã qua · Chỉ xem phân công.</p>}
    {cell.assignments.length > 1 && <p className="mb-3 text-sm">Ngày này có nhiều lượt phân công. Xem chi tiết tại màn phân công trong ngày.</p>}
    {!cell.person.eligible && <p className="mb-3 text-sm">Nhân viên không có trong danh sách đang làm việc của vùng. Chỉ xem lịch đã có.</p>}
    {cell.assignments.map((entry) => <p key={entry.id} className="mb-2 text-sm">{assignmentLabel(entry)}{entry.onLeave && " · Đã duyệt nghỉ"}</p>)}
    {emptyMessage && <p>{emptyMessage}</p>}
    {rights.save && (lookups.loading || rafts.loading ? <Skeleton /> : <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={mutation.pending || mutation.blocked || !!lookups.error || !!rafts.error} className="space-y-4">
        {lookups.data?.employees.find((employee) => employee.id === cell.person.id)?.onLeave && <p className="rounded-control bg-warning/10 p-3 text-sm">Nhân viên đã được duyệt nghỉ ngày này. Bạn vẫn có thể lưu phân công.</p>}
        <Select label="Loại công việc *" required value={jobTypeId} onChange={(event) => setJobTypeId(event.target.value)}>
          <option value="">Chọn công việc</option>{lookups.data?.jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}
        </Select>
        <Select label="Bè làm việc" value={raftId} onChange={(event) => setRaftId(event.target.value)}>
          <option value="">Cấp vùng (không có bè)</option>
          {raftId && !rafts.data?.some((raft) => raft.id === raftId) && <option value={raftId}>{row?.raftCode || "Bè đã phân công"}</option>}
          {rafts.data?.map((raft) => <option key={raft.id} value={raft.id}>{String(raft.code)}</option>)}
        </Select>
        {row && cell.day > businessToday() && <p className="text-sm text-text-muted">Lưu sẽ thay công việc và bè của phân công ngày này.</p>}
        <Button type="submit" disabled={!!row && !dirty} title={row && !dirty ? "Chưa có thay đổi để lưu" : undefined} isPending={mutation.pending} pendingLabel="Đang lưu…">Lưu phân công</Button>
      </fieldset>
    </form>)}
    {rights.remove && <div className="mt-4">
      {removing ? <div className="space-y-3 rounded-control border border-border p-3"><p>Gỡ phân công của {cell.person.name} ngày {formatVietnameseDate(cell.day)}?</p>
        <Button variant="danger" disabled={mutation.blocked} isPending={mutation.pending} pendingLabel="Đang gỡ…" onClick={() => void remove()}>Xác nhận gỡ</Button>
        <Button variant="ghost" disabled={mutation.pending} onClick={() => setRemoving(false)}>Bỏ qua</Button></div>
        : <Button variant="ghost" disabled={mutation.pending || mutation.blocked} onClick={() => setRemoving(true)}>Gỡ phân công</Button>}
    </div>}
    {mutation.blocked && <p role="alert" className="mt-3 text-sm">Hãy đóng và tải lại lịch để đối chiếu kết quả trước khi gửi tiếp.</p>}
    {closing && <div className="mt-4 rounded-control border border-border p-3"><p>Đóng và bỏ thay đổi chưa lưu? Lịch sẽ được tải lại để đối chiếu.</p>
      <Button variant="secondary" onClick={onClose}>Đóng và tải lại lịch</Button><Button variant="ghost" onClick={() => setClosing(false)}>Tiếp tục sửa</Button></div>}
    {!closing && <Button variant="secondary" className="mt-4" disabled={mutation.pending} onClick={close}>Đóng</Button>}
  </Dialog>;
}
