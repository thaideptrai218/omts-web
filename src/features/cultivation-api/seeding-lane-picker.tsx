"use client";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { applyLaneRangeSelection, droppedLanes } from "./lane-range-selection";
import { LanePickerOverview as LaneOverview, type LanePickerDraftProps } from "./lane-picker-overview";
import type { LaneOverviewItem } from "@/features/farming-management/lane-overview";
import type { LaneOperatingScope } from "@/features/rafts-api/lane-operating-details";
import { compressLaneNumbers } from "@/features/farming-management/lane-ranges";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type Lane = LaneOverviewItem & { canSeed: boolean };

/** Bulk selection only offers lanes allowed by the backend; existing corrections retain their lanes. */
export function SeedingLanePicker({ lanes: source, notSeededLanes, choices, values, editing, onChange, scope, onDirty, onPending }: { lanes: readonly Lane[]; notSeededLanes: readonly number[]; choices: number[]; values: number[]; editing: boolean; onChange(values: number[]): void; scope?: LaneOperatingScope } & LanePickerDraftProps) {
  const lanes = source.map(lane => ({ ...lane, state: lane.state ?? (notSeededLanes.includes(lane.laneNumber) ? "NotSeeded" : "Growing") }));
  const [supplement, setSupplement] = useState(false), [range, setRange] = useState(""), [exclude, setExclude] = useState(""), [error, setError] = useState<string>();
  // Lanes ticked and then taken out (unticked or excluded): shown in the counter so "28/30 · bỏ: 15, 18" is visible at a glance.
  const [dropped, setDropped] = useState<number[]>([]);
  const anchor = useRef<number | undefined>(undefined), id = useId();
  const available = new Set(choices);
  const unseeded = lanes.filter(lane => lane.state === "NotSeeded" && available.has(lane.laneNumber)).map(lane => lane.laneNumber);
  const seeded = lanes.filter(lane => lane.state !== "NotSeeded").map(lane => lane.laneNumber);
  const visible = lanes.filter(lane => available.has(lane.laneNumber) && (lane.state === "NotSeeded" || supplement && lane.state === "Growing" || editing && values.includes(lane.laneNumber)));
  const shown = new Set(visible.map(lane => lane.laneNumber));
  const update = (next: number[], alsoDropped: readonly number[] = []) => {
    const sorted = [...new Set(next)].sort((a, b) => a - b);
    setError(undefined); setDropped(current => sorted.length ? droppedLanes(values, sorted, [...current, ...alsoDropped]) : []); onChange(sorted);
  };
  function applyRange() {
    if (!range.trim() && !exclude.trim()) { setError("Nhập dải làn như 1-10, 15, 20-25 hoặc các làn cần bỏ."); return; }
    const outcome = applyLaneRangeSelection({ current: values, range, exclude, eligible: [...shown] });
    if (outcome.invalid.length) { setError(`Không đọc được: ${outcome.invalid.join(", ")}. Nhập dải làn như 1-10, 15, 20-25.`); return; }
    if (outcome.refused.length) { setError(`Làn ${compressLaneNumbers(outcome.refused)} không đủ điều kiện. Chỉ chọn các làn đang hiển thị; bật thả bổ sung nếu cần.`); return; }
    update(outcome.next, outcome.excluded); setRange(""); setExclude("");
  }
  const applyOnEnter = (event: KeyboardEvent) => { if (event.key === "Enter") { event.preventDefault(); applyRange(); } };
  return <section className="min-w-0 space-y-4 rounded-card border border-border p-3 sm:p-4" aria-label="Chọn làn thả giống">
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <h4 className="text-sm font-semibold">Làn thả giống</h4>
      <span className="text-xs font-medium text-primary" aria-live="polite">Đã chọn {values.length}/{visible.length} làn{!!dropped.length && ` · bỏ: ${compressLaneNumbers(dropped)}`}</span>
    </div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Button type="button" variant="secondary" className="w-auto" onClick={() => update([...values, ...unseeded])}>Chọn tất cả làn chưa thả</Button>
      <Button type="button" variant="secondary" className="w-auto" onClick={() => update([])}>Bỏ chọn</Button>
      <label className="flex items-center gap-2 text-sm sm:ml-auto"><Switch checked={supplement} onChange={event => setSupplement(event.target.checked)} />Thả bổ sung vào làn đang nuôi</label>
    </div>
    <div className="space-y-1">
      <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="block min-w-0 text-xs font-medium text-text-muted">Chọn dải làn
          <input className="omts-control mt-1" inputMode="numeric" autoComplete="off" placeholder="1-30" value={range} onChange={event => setRange(event.target.value)} onKeyDown={applyOnEnter} aria-describedby={`${id}-hint`} aria-invalid={error ? true : undefined} />
        </label>
        <label className="block min-w-0 text-xs font-medium text-text-muted">Bỏ các làn (tùy chọn)
          <input className="omts-control mt-1" inputMode="numeric" autoComplete="off" placeholder="15, 18" value={exclude} onChange={event => setExclude(event.target.value)} onKeyDown={applyOnEnter} aria-describedby={`${id}-hint`} aria-invalid={error ? true : undefined} />
        </label>
        <Button type="button" variant="secondary" className="w-auto" onClick={applyRange}>Áp dụng</Button>
      </div>
      <p id={`${id}-hint`} role={error ? "alert" : undefined} className={`text-xs ${error ? "text-danger" : "text-text-muted"}`}>{error ?? "Ví dụ: chọn dải 1-30, bỏ 15, 18. Bấm vào một làn để chọn hoặc bỏ chọn; giữ Shift và bấm hai đầu để chọn một dải."}</p>
    </div>
    {(!!seeded.length || !!values.length) && <div className="space-y-1 text-xs">
      {!!seeded.length && <p className="text-text-muted">Đã thả: làn {compressLaneNumbers(seeded)}</p>}
      {!!values.length && <p className="font-medium text-primary">Đang chọn: làn {compressLaneNumbers(values)}</p>}
    </div>}
    <LaneOverview scope={scope} onDirty={onDirty} onPending={onPending} lanes={visible} selected={values} onSelectionChange={update} label="Làn có thể thả giống" emptyMessage="Không có làn đủ điều kiện." onLaneClick={(number, event) => {
      if (event.shiftKey && anchor.current !== undefined) {
        const low = Math.min(anchor.current, number), high = Math.max(anchor.current, number);
        update([...values, ...visible.filter(lane => lane.laneNumber >= low && lane.laneNumber <= high).map(lane => lane.laneNumber)]);
      } else update(values.includes(number) ? values.filter(value => value !== number) : [...values, number]);
      anchor.current = number;
    }} />
  </section>;
}
