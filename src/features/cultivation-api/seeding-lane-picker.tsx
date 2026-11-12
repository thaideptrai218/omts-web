"use client";
import { useId, useRef, useState } from "react";
import { LaneOverview } from "@/features/farming-management/lane-overview";
import { compressLaneNumbers, parseLaneRanges } from "@/features/farming-management/lane-ranges";
import { Switch } from "@/components/ui/switch";

type Lane = { laneNumber: number; state?: string; canSeed: boolean; isDamaged?: boolean; isOutOfService?: boolean };

/** Bulk selection only offers lanes allowed by the backend; existing corrections retain their lanes. */
export function SeedingLanePicker({ lanes: source, notSeededLanes, choices, values, editing, onChange }: { lanes: readonly Lane[]; notSeededLanes: readonly number[]; choices: number[]; values: number[]; editing: boolean; onChange(values: number[]): void }) {
  const lanes = source.map(lane => ({ ...lane, state: lane.state ?? (notSeededLanes.includes(lane.laneNumber) ? "NotSeeded" : "Growing") }));
  const [supplement, setSupplement] = useState(false), [range, setRange] = useState(""), [error, setError] = useState<string>();
  const anchor = useRef<number | undefined>(undefined), id = useId();
  const available = new Set(choices);
  const unseeded = lanes.filter(lane => lane.state === "NotSeeded" && available.has(lane.laneNumber)).map(lane => lane.laneNumber);
  const seeded = lanes.filter(lane => lane.state !== "NotSeeded").map(lane => lane.laneNumber);
  const visible = lanes.filter(lane => available.has(lane.laneNumber) && (lane.state === "NotSeeded" || supplement && lane.state === "Growing" || editing && values.includes(lane.laneNumber)));
  const shown = new Set(visible.map(lane => lane.laneNumber));
  const update = (next: number[]) => { setError(undefined); onChange([...new Set(next)].sort((a, b) => a - b)); };
  function applyRange() {
    const parsed = parseLaneRanges(range);
    if (!parsed?.length) { setError("Nhập dải làn như 1-10, 15, 20-25."); return; }
    if (parsed.some(number => !shown.has(number))) { setError("Dải có làn không đủ điều kiện. Chỉ chọn các làn đang hiển thị; bật thả bổ sung nếu cần."); return; }
    update([...values, ...parsed]);
  }
  return <section className="space-y-3 rounded-control border border-border p-3" aria-label="Chọn làn thả giống">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">Làn thả giống</h4><span className="text-xs font-medium text-primary" aria-live="polite">Đã chọn {values.length}/{lanes.length} làn</span></div>
    <div className="flex flex-wrap gap-3 text-xs font-medium text-primary">
      <button type="button" className="min-h-8 underline underline-offset-4" onClick={() => update([...values, ...unseeded])}>Chọn tất cả làn chưa thả</button>
      <button type="button" className="min-h-8 underline underline-offset-4" onClick={() => update([])}>Bỏ chọn</button>
    </div>
    <div className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 space-y-1 text-xs font-medium" htmlFor={id}>Chọn dải làn<input id={id} className="omts-control block w-full" placeholder="1-10, 15, 20-25" value={range} onChange={event => setRange(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); applyRange(); } }} aria-describedby={error ? `${id}-error` : undefined} /></label><button type="button" className="omts-control px-3 text-xs font-semibold text-primary" onClick={applyRange}>Chọn dải</button></div>
    {error && <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error}</p>}
    <label className="flex items-center gap-2 text-xs"><Switch checked={supplement} onChange={event => setSupplement(event.target.checked)} />Thả bổ sung vào làn đang nuôi</label>
    {!!seeded.length && <p className="text-xs text-text-muted">Đã thả: làn {compressLaneNumbers(seeded)}</p>}
    {!!values.length && <p className="text-xs font-medium text-primary">Đang chọn: làn {compressLaneNumbers(values)}</p>}
    <LaneOverview lanes={visible} selected={values} label="Làn có thể thả giống" onLaneClick={(number, event) => {
      if (event.shiftKey && anchor.current !== undefined) {
        const low = Math.min(anchor.current, number), high = Math.max(anchor.current, number);
        update([...values, ...visible.filter(lane => lane.laneNumber >= low && lane.laneNumber <= high).map(lane => lane.laneNumber)]);
      } else update(values.includes(number) ? values.filter(value => value !== number) : [...values, number]);
      anchor.current = number;
    }} />
    <p className="text-xs text-text-muted">Giữ Shift và chọn hai đầu để chọn nhanh một dải làn.</p>
  </section>;
}
