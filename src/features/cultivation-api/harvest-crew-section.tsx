"use client";
import { useCallback, useEffect, useState } from "react";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { planRepository } from "@/features/harvest-plans/repository";
import { Skeleton, useRemote } from "@/features/operations/ui";
import { RecordCrewPicker } from "./record-crew-picker";

const COUNTED = new Set(["Confirmed", "ConfirmedManually", "External"]);

/**
 * "Nhân viên cùng thu" of the harvest form. People are chosen once, in the plan's Nhân công: when the plan has people who confirmed, they are listed here (read only, with the count) and sent as the crew;
 * "Điều chỉnh" opens the usual two-group picker for the rare change. A plan without such people (or a roster that cannot be read) shows the picker straight away, with nobody ticked.
 * `onChange` is called only when the user changes the crew; `onPrefill` once with the people of the roster.
 */
export function HarvestCrewSection({ planId, raftId, zoneId, values, onChange, onPrefill }: {
  planId?: string; raftId: string; zoneId: string; values: string[]; onChange(values: string[]): void; onPrefill(values: string[]): void;
}) {
  const remote = useRemote(useCallback((signal: AbortSignal) => planId ? planRepository.roster(planId, signal) : Promise.resolve({ status: "error" as const, httpStatus: 0, uncertain: false }), [planId]));
  const [adjusting, setAdjusting] = useState(false);
  const confirmed = (remote.data?.people ?? []).filter((person) => COUNTED.has(person.state));
  const confirmedKey = confirmed.map((person) => person.employeeId).join(",");
  useEffect(() => { if (confirmedKey) onPrefill(confirmedKey.split(",")); }, [confirmedKey, onPrefill]);

  const title = "Nhân viên cùng thu";
  if (planId && remote.loading) return <CollapsibleSection title={title} columns={1}><Skeleton /></CollapsibleSection>;
  if (!confirmed.length || adjusting) {
    return <CollapsibleSection title={title} description="Những người đi thu chuyến này." columns={1}>
      <RecordCrewPicker label={title} raftId={raftId} zoneId={zoneId} values={values} onChange={onChange} confirmedIds={confirmed.map((person) => person.employeeId)} />
    </CollapsibleSection>;
  }
  const required = remote.data?.requiredPeople;
  return <CollapsibleSection title={title} description="Những người đã xác nhận trong tab Nhân công." columns={1}>
    <div className="grid gap-2 text-sm">
      <p className="flex flex-wrap items-baseline justify-between gap-2">
        <strong>{values.length} người{required != null ? ` / cần ${required}` : ""}</strong>
        <button type="button" className="text-primary underline underline-offset-2" onClick={() => setAdjusting(true)}>Điều chỉnh</button>
      </p>
      <ul aria-label="Người cùng thu" className="flex flex-wrap gap-2">
        {confirmed.map((person) => <li key={person.id} className="rounded-full border border-border bg-surface-subtle px-3 py-1">{person.name}</li>)}
      </ul>
    </div>
  </CollapsibleSection>;
}
