"use client";
import { useState, type ReactNode } from "react";
import { Field } from "@/features/operations/ui";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import { EmployeeTypeBadge } from "./employee-type-badge";
import { useEmployeeFacts } from "./use-employee-types";

/** One person the picker can offer. `kind` ("Staff" or "SeasonalWorker") and the fixed zones are read from the employee list when the caller does not have them. */
export type PickerPerson = { id: string; name: string; kind?: string | null; /** Not choosable (already busy, on leave...): shown, never ticked by "Chọn tất cả". */ disabled?: boolean; /** A small line under the name (why it is busy, who assigned it). */ note?: ReactNode };

const groups = [
  { kind: "Staff", title: "Nội bộ", hint: "Lương tháng, có vùng cố định", empty: "Chưa có nhân viên nội bộ." },
  { kind: "SeasonalWorker", title: "Thời vụ", hint: "Trả theo giờ hoặc theo ca, gọi khi có việc", empty: "Chưa có nhân viên thời vụ." },
] as const;

/**
 * The one way to choose people for field work: two groups side by side (stacked on a phone), "Nội bộ" first with each person's zone and "Thời vụ" after it,
 * each with its own count, search and "Chọn tất cả". A person whose kind is not known yet is listed with the Nội bộ group, without a marker.
 * `locked` people stay ticked and cannot be unticked. The caller keeps its own data loading and decides who is offered.
 */
export function EmployeeTwoGroupPicker({ people, values, onChange, locked = [], name, label, zoneIds }: {
  people: readonly PickerPerson[]; values: readonly string[]; onChange(values: string[]): void; locked?: readonly string[]; name: string; label?: string;
  /** The zones of the work: nội bộ staff of other zones are not offered (thời vụ can be sent anywhere). */ zoneIds?: readonly string[];
}) {
  const { kindOf, zonesOf, worksIn } = useEmployeeFacts();
  const [searches, setSearches] = useState<Record<string, string>>({});
  const kindOfPerson = (person: PickerPerson) => (person.kind === "SeasonalWorker" || person.kind === "Staff" ? person.kind : kindOf(person.id)) ?? "Staff";
  const isTicked = (id: string) => values.includes(id) || locked.includes(id);
  const toggle = (id: string, ticked: boolean) => onChange(ticked ? [...values.filter((value) => value !== id), id] : values.filter((value) => value !== id));

  return <div className="grid gap-3 md:grid-cols-2" role="group" aria-label={label ?? "Chọn nhân viên"}>
    {groups.map((group) => {
      const all = people.filter((person) => kindOfPerson(person) === group.kind);
      // Someone already chosen stays visible, so an older record can still be read and corrected.
      const members = group.kind === "Staff" && zoneIds?.length ? all.filter((person) => isTicked(person.id) || worksIn(person.id, zoneIds)) : all;
      const hidden = all.length - members.length, term = foldVietnamese((searches[group.kind] ?? "").trim());
      const shown = members.filter((person) => foldVietnamese(person.name).includes(term));
      const choosable = shown.filter((person) => !person.disabled && !locked.includes(person.id)), allTicked = choosable.length > 0 && choosable.every((person) => values.includes(person.id));
      const chosen = members.filter((person) => isTicked(person.id)).length;
      return <section key={group.kind} className="min-w-0 rounded-control border border-border p-3" aria-label={`${group.title}, ${members.length} người`}>
        <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold"><EmployeeTypeBadge type={group.kind} showLabel={group.kind === "Staff"} /><span className="font-normal text-text-muted">{members.length} người{chosen ? `, đã chọn ${chosen}` : ""}</span></h4>
            <p className="text-xs text-text-muted">{group.hint}{hidden > 0 ? `. Ẩn ${hidden} người thuộc vùng khác` : ""}</p>
          </div>
          <button type="button" className="text-sm font-medium text-primary underline underline-offset-4 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50" disabled={!choosable.length}
            onClick={() => onChange(allTicked ? values.filter((id) => !choosable.some((person) => person.id === id)) : [...new Set([...values, ...choosable.map((person) => person.id)])])}>
            {allTicked ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
        </header>
        {members.length > 0 && <Field label={`Tìm trong nhóm ${group.title}`} type="search" value={searches[group.kind] ?? ""} onChange={(event) => setSearches((current) => ({ ...current, [group.kind]: event.target.value }))} />}
        <div className="mt-2 max-h-52 space-y-2 overflow-y-auto">
          {shown.map((person) => {
            const zones = group.kind === "Staff" ? zonesOf(person.id) : [], lockedPerson = locked.includes(person.id);
            return <label key={person.id} className={`flex items-start gap-2 rounded-control border border-border p-2 text-sm ${person.disabled && !isTicked(person.id) ? "text-text-muted" : ""}`}>
              <input className="omts-check" type="checkbox" name={`${name}-${group.kind}`} checked={isTicked(person.id)} disabled={lockedPerson || (!!person.disabled && !values.includes(person.id))} onChange={(event) => toggle(person.id, event.target.checked)} />
              <span className="min-w-0">{person.name}{zones.length > 0 && <small className="block text-text-muted">Vùng {zones.join(", ")}</small>}{person.note}</span>
            </label>;
          })}
          {members.length === 0 && <p className="text-sm text-text-muted">{hidden > 0 ? "Vùng này chưa có nhân viên nội bộ." : group.empty}</p>}
          {members.length > 0 && shown.length === 0 && <p className="text-sm text-text-muted">Không có ai khớp tìm kiếm.</p>}
        </div>
      </section>;
    })}
  </div>;
}
