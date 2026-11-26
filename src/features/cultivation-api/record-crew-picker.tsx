"use client";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Skeleton, businessToday, useRemote } from "@/features/operations/ui";
import { EmployeeTwoGroupPicker } from "@/features/employee-api/employee-two-group-picker";
import { readRecordCrew } from "./record-crew-repository";

const viDay = (day: string) => day.split("-").reverse().join("/");

/**
 * Multi-select of the employees who did this record (nursery, seeding or harvest); employees assigned to the raft that day come first, anyone active can be chosen. A nursery has no raft. `day` is the business date
 * the crew is for (today by default; the harvest plan's day for its Nhân công). `locked` employees stay chosen and cannot be unticked (an employee already checked in on the plan's day).
 */
export function RecordCrewPicker({ raftId, zoneId, values, onChange, label = "Nhân viên thực hiện", day = businessToday(), locked = [] }: {
  raftId?: string; zoneId: string; values: string[]; onChange(values: string[]): void; label?: string; day?: string; locked?: readonly string[];
}) {
  const dayText = day === businessToday() ? "hôm nay" : `ngày ${viDay(day)}`;
  const remote = useRemote(useCallback(signal => readRecordCrew(raftId, zoneId, day, signal), [raftId, zoneId, day]));
  return <fieldset className="space-y-2"><legend className="text-sm font-medium">{label}</legend>
    {remote.loading ? <Skeleton /> : remote.error ? <><ErrorNotice error={remote.error} /><Button key="retry-crew" type="button" variant="secondary" className="w-auto" onClick={remote.reload}>Tải lại nhân viên</Button></>
      : !remote.data?.length ? <p className="text-sm text-text-muted">Chưa có danh sách nhân viên để chọn.</p>
        : <EmployeeTwoGroupPicker name={`crew-${label}`} label={label} values={values} onChange={onChange} locked={locked} people={remote.data.map(item => ({
          id: item.id, name: item.name, kind: item.kind, disabled: !!item.busy,
          note: locked.includes(item.id) ? <small className="block text-text-muted">Đã điểm danh nên không bỏ khỏi bè được</small> : <>{item.preferred && <small className="block text-text-muted">Đã phân công cho bè {dayText}</small>}{item.busy && <small className="block text-text-muted">{item.busy}</small>}</>,
        }))} />}
  </fieldset>;
}
