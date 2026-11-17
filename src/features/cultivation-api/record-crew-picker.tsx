"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Field, Skeleton, businessToday, useRemote } from "@/features/operations/ui";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import { readRecordCrew } from "./record-crew-repository";

const viDay = (day: string) => day.split("-").reverse().join("/");

/**
 * Multi-select of the employees who did this record (nursery, seeding or harvest); employees assigned to the raft that day come first, anyone active can be chosen. A nursery has no raft. `day` is the business date
 * the crew is for (today by default; the harvest plan's day for its Nhân công). `locked` employees stay chosen and cannot be unticked (an employee already checked in on the plan's day).
 */
export function RecordCrewPicker({ raftId, zoneId, values, onChange, label = "Nhân viên thực hiện", day = businessToday(), locked = [] }: {
  raftId?: string; zoneId: string; values: string[]; onChange(values: string[]): void; label?: string; day?: string; locked?: readonly string[];
}) {
  const [search, setSearch] = useState("");
  const dayText = day === businessToday() ? "hôm nay" : `ngày ${viDay(day)}`;
  const remote = useRemote(useCallback(signal => readRecordCrew(raftId, zoneId, day, signal), [raftId, zoneId, day]));
  const items = remote.data?.filter(item => foldVietnamese(item.name).includes(foldVietnamese(search.trim()))) ?? [];
  return <fieldset className="space-y-2"><legend className="text-sm font-medium">{label}</legend>
    {remote.loading ? <Skeleton /> : remote.error ? <><ErrorNotice error={remote.error} /><Button key="retry-crew" type="button" variant="secondary" className="w-auto" onClick={remote.reload}>Tải lại nhân viên</Button></>
      : !remote.data?.length ? <p className="text-sm text-text-muted">Chưa có danh sách nhân viên để chọn.</p> : <>
        <Field label="Tìm nhân viên" type="search" value={search} onChange={event => setSearch(event.target.value)} />
        <div className="max-h-52 space-y-2 overflow-y-auto">{items.map(item => <label key={item.id} className="flex items-start gap-2 rounded-control border border-border p-2 text-sm">
          <input className="omts-check" type="checkbox" checked={values.includes(item.id) || locked.includes(item.id)} disabled={locked.includes(item.id) || !!item.busy && !values.includes(item.id)} onChange={event => onChange(event.target.checked ? [...values, item.id] : values.filter(id => id !== item.id))} />
          <span>{item.name}{locked.includes(item.id) ? <small className="block text-text-muted">Đã điểm danh nên không bỏ khỏi bè được</small> : item.preferred && <small className="block text-text-muted">Đã phân công cho bè {dayText}</small>}{item.busy && <small className="block text-text-muted">{item.busy}</small>}</span>
        </label>)}</div>
        {!items.length && <p className="text-sm text-text-muted">Không có nhân viên phù hợp tìm kiếm.</p>}
      </>}
  </fieldset>;
}
