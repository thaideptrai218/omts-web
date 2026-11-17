"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Field, Skeleton, businessToday, useRemote } from "@/features/operations/ui";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import { readHarvestCrew } from "./harvest-crew-repository";

/** Multi-select of the employees working this harvest; employees assigned to the raft today come first, anyone active can be chosen. */
export function HarvestCrewPicker({ raftId, zoneId, values, onChange }: { raftId: string; zoneId: string; values: string[]; onChange(values: string[]): void }) {
  const [search, setSearch] = useState("");
  const day = businessToday();
  const remote = useRemote(useCallback(signal => readHarvestCrew(raftId, zoneId, day, signal), [raftId, zoneId, day]));
  const items = remote.data?.filter(item => foldVietnamese(item.name).includes(foldVietnamese(search.trim()))) ?? [];
  return <fieldset className="space-y-2"><legend className="text-sm font-medium">Nhân viên cùng thu</legend>
    {remote.loading ? <Skeleton /> : remote.error ? <><ErrorNotice error={remote.error} /><Button key="retry-crew" type="button" variant="secondary" className="w-auto" onClick={remote.reload}>Tải lại nhân viên</Button></>
      : !remote.data?.length ? <p className="text-sm text-text-muted">Chưa có danh sách nhân viên để chọn.</p> : <>
        <Field label="Tìm nhân viên" type="search" value={search} onChange={event => setSearch(event.target.value)} />
        <div className="max-h-52 space-y-2 overflow-y-auto">{items.map(item => <label key={item.id} className="flex items-start gap-2 rounded-control border border-border p-2 text-sm">
          <input className="omts-check" type="checkbox" checked={values.includes(item.id)} onChange={event => onChange(event.target.checked ? [...values, item.id] : values.filter(id => id !== item.id))} />
          <span>{item.name}{item.preferred && <small className="block text-text-muted">Đã phân công cho bè hôm nay</small>}</span>
        </label>)}</div>
        {!items.length && <p className="text-sm text-text-muted">Không có nhân viên phù hợp tìm kiếm.</p>}
      </>}
  </fieldset>;
}
