"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatVietnameseDate } from "@/shared/format/date-only";
import * as c from "./new-module-contracts";
import { ErrorNotice, Field, Note, Skeleton, displayTime, useRemote } from "./ui";
import { useOperationEditor } from "./use-operation-editor";
import { correctionProblem, estimatePaidMinutes, minutesLabel, toInstant, toLocalInput } from "./workforce-correction-model";
import * as w from "./workforce-contracts";
import { workforceRepository as repository } from "./workforce-shared";

/**
 * "Sửa chấm công" (Owner only): the check-in, the check-out (up to 18 hours after the check-in, so it may be on the next day) and the start of each
 * job period of one employee on one day, with a mandatory reason. The estimated paid hours are shown before saving; the server's figure after.
 */
export function AttendanceCorrectionDialog({ employeeId, day, onClose, onSaved }: { employeeId: string; day: string; onClose(): void; onSaved(day: w.AttendanceDay): void }) {
  const record = useRemote(useMemo(() => (signal: AbortSignal) => repository.read("attendance", { employeeId, day }, w.attendanceDaySchema, signal), [employeeId, day]));
  const settings = useRemote(useMemo(() => (signal: AbortSignal) => repository.read("settings", {}, c.attendanceSettingsSchema, signal), []));
  const data = record.data;
  // Edited values; undefined = still the loaded ones.
  const [edit, setEdit] = useState<{ checkIn?: string; checkOut?: string; reason: string; starts: Record<string, string> }>({ reason: "", starts: {} });
  const [problem, setProblem] = useState<string>(), [saved, setSaved] = useState<w.AttendanceDay>();
  const dirty = edit.checkIn !== undefined || edit.checkOut !== undefined || !!edit.reason || Object.keys(edit.starts).length > 0;
  const editor = useOperationEditor(onClose, dirty && !saved);
  const checkIn = edit.checkIn ?? toLocalInput(data?.checkedInAt ?? null), checkOut = edit.checkOut ?? toLocalInput(data?.checkedOutAt ?? null);
  const startOf = (index: number, startsAt: string | null) => edit.starts[String(index)] ?? toLocalInput(startsAt);
  const periodStarts = (data?.periods ?? []).map((period, index) => (index === 0 ? "" : startOf(index, period.startsAt)));
  const estimate = estimatePaidMinutes(checkIn, checkOut, settings.data?.current);

  async function save() {
    if (!data) return;
    const invalid = !edit.reason.trim() ? "Nhập lý do sửa chấm công." : correctionProblem(day, checkIn, checkOut, periodStarts);
    if (invalid) return setProblem(invalid);
    const payload = w.correctAttendanceSchema.safeParse({
      checkInAt: toInstant(checkIn), checkOutAt: toInstant(checkOut), reason: edit.reason, rowVersion: data.rowVersion,
      periods: data.periods.map((period, index) => ({ jobTypeId: period.jobTypeId, raftId: period.raftId, zoneId: period.zoneId, startsAt: index === 0 ? null : toInstant(periodStarts[index]) })),
    });
    if (!payload.success) return setProblem("Kiểm tra lại giờ vào, giờ ra và lý do.");
    setProblem(undefined);
    const result = await editor.submit(`Sửa chấm công của ${data.employeeName} ngày ${formatVietnameseDate(day)}? Thao tác này được ghi vào nhật ký.`,
      () => repository.write("correct", { day, payload: payload.data }, w.attendanceCorrectedSchema, employeeId));
    if (result) setSaved(result.day);
  }
  const hours = (d: w.AttendanceDay) => d.jobs.reduce((sum, job) => sum + job.hours, 0);

  return <Dialog open size="md" mobileLayout="compact" title="Sửa chấm công" dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void (saved ? onSaved(saved) : editor.close()); }}>
    {editor.dialog}
    <ErrorNotice error={problem ?? editor.mutation.error ?? record.error} />
    {record.loading && <Skeleton />}
    {record.error && <Button variant="secondary" className="w-auto" onClick={record.reload}>Tải lại chấm công</Button>}
    {data && !saved && <form onSubmit={(event) => { event.preventDefault(); void save(); }} noValidate>
      <p className="mb-3"><strong>{data.employeeName}</strong> · ngày {formatVietnameseDate(day)}</p>
      <fieldset disabled={editor.disabled} className="grid gap-3">
        <Field label="Giờ vào" type="datetime-local" value={checkIn} onChange={(event) => setEdit({ ...edit, checkIn: event.target.value })} />
        <Field label="Giờ ra (có thể sang ngày hôm sau)" type="datetime-local" value={checkOut} onChange={(event) => setEdit({ ...edit, checkOut: event.target.value })} />
        {data.periods.length > 0 && <div aria-label="Các lần làm việc trong ngày" className="grid gap-2">
          <p className="text-sm font-semibold">Công việc trong ngày</p>
          {data.periods.map((period, index) => <div key={period.id} className="grid gap-1 rounded-control border border-border p-2">
            <span>{period.job}{period.raftCode ? ` · bè ${period.raftCode}` : ""}</span>
            {index === 0 ? <span className="text-sm text-muted">Bắt đầu từ giờ vào{checkIn ? ` (${displayTime(toInstant(checkIn) ?? "")})` : ""}</span>
              : <Field label="Bắt đầu lúc" type="datetime-local" value={periodStarts[index]} onChange={(event) => setEdit({ ...edit, starts: { ...edit.starts, [String(index)]: event.target.value } })} />}
          </div>)}
        </div>}
        <Note label="Lý do sửa *" required maxLength={500} value={edit.reason} onChange={(event) => setEdit({ ...edit, reason: event.target.value })} />
        <p role="status" className="text-sm">{estimate ? `Giờ công tính lại: khoảng ${minutesLabel(estimate.paid)}${estimate.breakMinutes ? ` (đã trừ ${estimate.breakMinutes} phút nghỉ)` : ""}. Số chính thức hiển thị sau khi lưu.`
          : "Nhập đủ giờ vào và giờ ra để xem giờ công tính lại. Thiếu giờ ra thì ngày này chưa được tính công."}</p>
      </fieldset>
      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" className="w-auto" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
        <Button type="submit" className="w-auto" isPending={editor.pending}>Lưu chấm công</Button>
      </div>
    </form>}
    {saved && <div role="status">
      <p>Đã sửa chấm công của {saved.employeeName} ngày {formatVietnameseDate(saved.date)}.</p>
      <p>{saved.complete ? `Giờ công sau khi tính lại: ${minutesLabel(Math.round(hours(saved) * 60))}.` : "Ngày này vẫn chưa đủ giờ vào và giờ ra nên chưa được tính công."}</p>
      <div className="mt-4 flex justify-end"><Button type="button" className="w-auto" onClick={() => onSaved(saved)}>Đóng</Button></div>
    </div>}
  </Dialog>;
}
