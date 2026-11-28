"use client";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { loadOptions } from "./lookups";
import * as c from "./new-module-contracts";
import { Field, Select, displayTime, useRemote } from "./ui";
import { toInstant } from "./workforce-correction-model";
import * as w from "./workforce-contracts";
import { workforceRepository as repository } from "./workforce-shared";

/** One job period of the day as the Owner edits it; the first period of a day starts at the check-in, so it has no start of its own. */
export type PeriodDraft = { key: string; jobTypeId: string; zoneId: string; raftId: string; start: string; zoneOnly: boolean };

let nextKey = 0;
export const newDraft = (): PeriodDraft => ({ key: `new-${nextKey++}`, jobTypeId: "", zoneId: "", raftId: "", start: "", zoneOnly: false });

/** The periods the day already has, as drafts (an existing period with a zone and no raft, such as the nursery, may stay without one). */
export const draftsOf = (periods: readonly w.AttendanceDay["periods"][number][], startOf: (index: number, startsAt: string | null) => string): PeriodDraft[] =>
  periods.map((period, index) => ({ key: period.id, jobTypeId: period.jobTypeId, zoneId: period.zoneId ?? "", raftId: period.raftId ?? "", start: index === 0 ? "" : startOf(index, period.startsAt), zoneOnly: !period.raftId && !!period.zoneId }));

/** The first period without job type or place, if any: the message to show. */
export const draftsProblem = (drafts: readonly PeriodDraft[]): string | undefined =>
  drafts.some((d) => !d.jobTypeId || !d.zoneId || (!d.raftId && !d.zoneOnly)) ? "Mỗi đoạn việc cần chọn loại công việc, vùng và bè." : undefined;

export const draftsPayload = (drafts: readonly PeriodDraft[]) =>
  drafts.map((d, index) => ({ jobTypeId: d.jobTypeId, raftId: d.raftId || null, zoneId: d.raftId ? null : d.zoneId || null, startsAt: index === 0 ? null : toInstant(d.start) }));

function PeriodRow({ draft, index, jobs, zones, checkIn, onChange, onRemove }: {
  draft: PeriodDraft; index: number; jobs: readonly { id: string; name: string }[]; zones: readonly { id: string; name: string }[]; checkIn: string;
  onChange(next: PeriodDraft): void; onRemove(): void;
}) {
  const rafts = useRemote(useMemo(() => (signal: AbortSignal) => draft.zoneId ? loadOptions("rafts", signal, { zoneId: draft.zoneId, statusId: "101" }) : Promise.resolve({ status: "success" as const, data: [] }), [draft.zoneId]));
  return <div className="grid gap-2 rounded-control border border-border p-2">
    <Select label="Loại công việc *" value={draft.jobTypeId} onChange={(event) => onChange({ ...draft, jobTypeId: event.target.value })}>
      <option value="">Chọn công việc</option>
      {jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}
    </Select>
    <Select label="Vùng *" value={draft.zoneId} onChange={(event) => onChange({ ...draft, zoneId: event.target.value, raftId: "", zoneOnly: false })}>
      <option value="">Chọn vùng</option>
      {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
    </Select>
    <Select label="Bè *" value={draft.raftId} onChange={(event) => onChange({ ...draft, raftId: event.target.value })}>
      <option value="">{draft.zoneOnly ? "Làm ở vùng (không có bè)" : "Chọn bè"}</option>
      {rafts.data?.map((raft) => <option key={raft.id} value={raft.id}>{String(raft.code)}</option>)}
    </Select>
    {index === 0 ? <span className="text-sm text-muted">Bắt đầu từ giờ vào{checkIn ? ` (${displayTime(toInstant(checkIn) ?? "")})` : ""}</span>
      : <Field label="Bắt đầu lúc" type="datetime-local" value={draft.start} onChange={(event) => onChange({ ...draft, start: event.target.value })} />}
    <Button type="button" variant="ghost" className="w-auto justify-self-start" onClick={onRemove}>Xóa đoạn việc</Button>
  </div>;
}

/** The job periods of a day, added and removed freely: for an internal (Staff) employee the Owner enters them only for harvest, nursery or stocking work, so the shift pay is counted. */
export function PeriodEditor({ day, drafts, checkIn, staff, onChange }: { day: string; drafts: readonly PeriodDraft[]; checkIn: string; staff: boolean; onChange(next: PeriodDraft[]): void }) {
  const lookups = useRemote(useMemo(() => (signal: AbortSignal) => repository.read("lookups", { day }, c.workforceLookupsSchema, signal), [day]));
  const zones = useRemote(useMemo(() => (signal: AbortSignal) => loadOptions("zones", signal), []));
  const zoneOptions = (zones.data ?? []).filter((zone) => zone.statusId === 101).map((zone) => ({ id: zone.id, name: String(zone.name) }));
  return <div aria-label="Các lần làm việc trong ngày" className="grid gap-2">
    <p className="text-sm font-semibold">Công việc trong ngày</p>
    {staff && <p className="text-sm text-muted">Nhân viên nội bộ: chỉ nhập đoạn việc khi đi làm thu hoạch/ươm/thả để tính tiền ca.</p>}
    {(lookups.error || zones.error) && <p role="alert" className="text-sm text-danger">{lookups.error ?? zones.error}</p>}
    {drafts.map((draft, index) => <PeriodRow key={draft.key} draft={draft} index={index} jobs={lookups.data?.jobs ?? []} zones={zoneOptions} checkIn={checkIn}
      onChange={(next) => onChange(drafts.map((d) => (d.key === draft.key ? next : d)))} onRemove={() => onChange(drafts.filter((d) => d.key !== draft.key))} />)}
    <Button type="button" variant="secondary" className="w-auto justify-self-start" onClick={() => onChange([...drafts, newDraft()])}>Thêm đoạn việc</Button>
  </div>;
}
