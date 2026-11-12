"use client";
import { useMemo, useRef, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { formatLaneRanges, parseLaneRanges, uniqueSorted } from "./harvest-lane-ranges";
import type { harvestLane } from "./records-contracts";
import styles from "./harvest-lane-picker.module.css";

type Lane = z.infer<typeof harvestLane>;
type Tone = "success" | "neutral";

export const laneStateChip: Record<string, { label: string; tone: Tone }> = {
  NotSeeded: { label: "Chưa thả giống", tone: "neutral" },
  Growing: { label: "Đang nuôi", tone: "neutral" },
  BeingHarvested: { label: "Đang thu hoạch", tone: "success" },
  Harvested: { label: "Đã thu xong", tone: "success" },
  OutOfService: { label: "Ngừng hoạt động", tone: "neutral" },
};
const reasonText: Record<string, string> = {
  LaneRemoved: "Làn đã ngừng hoạt động.",
  LaneDamaged: "Làn đang hỏng; cần sửa trước khi thu hoạch.",
  LaneOutOfService: "Làn đã ngừng hoạt động; số làn không dùng lại.",
  NoOpenCycle: "Bè chưa có chu kỳ đang nuôi.",
  ReadOnly: "Chu kỳ đang ở chế độ chỉ xem.",
  NoPermission: "Bạn chưa được phân quyền thu hoạch ở vùng này.",
  NotSeeded: "Làn chưa thả giống nên chưa thể thu hoạch.",
  AlreadyHarvested: "Làn đã thu xong.",
};

/** Why a lane cannot be picked, in Vietnamese, or undefined when it can be. */
export const laneBlockedReason = (lane: Lane) => lane.statusId === 2002 ? reasonText.LaneRemoved
  : lane.isOutOfService || lane.state === "OutOfService" ? reasonText.LaneOutOfService : lane.isDamaged ? reasonText.LaneDamaged
  : lane.canHarvest ? undefined : reasonText[lane.reasonCode ?? ""] ?? "Làn chưa đủ điều kiện thu hoạch.";

/** Cell colour and legend entry of a lane: the incident states win over the growing state. */
type CellState = "Growing" | "BeingHarvested" | "Harvested" | "NotSeeded" | "Damaged" | "OutOfService";
const cellStateOf = (lane: Lane): CellState => lane.statusId === 2002 || lane.isOutOfService || lane.state === "OutOfService" ? "OutOfService" : lane.isDamaged ? "Damaged"
  : lane.state === "Harvested" || lane.reasonCode === "AlreadyHarvested" ? "Harvested" : lane.state === "BeingHarvested" ? "BeingHarvested"
  : lane.state === "Growing" || (!lane.state && lane.canHarvest) ? "Growing" : "NotSeeded";
const cellLabel: Record<CellState, string> = { Growing: "Đang nuôi", BeingHarvested: "Đang thu hoạch", Harvested: "Đã thu hoạch", NotSeeded: "Chưa thả giống", Damaged: "Hỏng", OutOfService: "Ngừng hoạt động" };
const legendOrder: CellState[] = ["Growing", "BeingHarvested", "Harvested", "NotSeeded", "Damaged", "OutOfService"];

/**
 * The lanes of the raft as a compact numbered grid: only lanes that can be harvested are shown by default (a toggle reveals the rest, disabled, with the reason as a tooltip).
 * Quick controls pick all, none, a typed range ("1-10, 15, 20-25") or a shift-click range. Eligible lanes include those already being harvested.
 */
export function HarvestLaneChoices({ lanes, values, onChange, label }: { lanes: Lane[]; values: number[]; onChange(values: number[]): void; label: string }) {
  const [showAll, setShowAll] = useState(false), [typed, setTyped] = useState(""), [note, setNote] = useState<string>();
  const anchor = useRef<number>(undefined);
  const info = useMemo(() => [...lanes].sort((a, b) => a.laneNumber - b.laneNumber).map(lane => ({ lane, blocked: laneBlockedReason(lane), state: cellStateOf(lane) })), [lanes]);
  const selectable = info.filter(item => !item.blocked).map(item => item.lane.laneNumber);
  const shown = showAll ? info : info.filter(item => !item.blocked);
  const hidden = info.length - selectable.length;
  const chosen = values.filter(n => selectable.includes(n));
  const set = (next: number[]) => { setNote(undefined); onChange(uniqueSorted(next)); };

  function click(number: number, shift: boolean) {
    const on = !values.includes(number), from = anchor.current;
    if (shift && from !== undefined) {
      const order = shown.filter(item => !item.blocked).map(item => item.lane.laneNumber), a = order.indexOf(from), b = order.indexOf(number);
      if (a >= 0 && b >= 0) {
        const range = order.slice(Math.min(a, b), Math.max(a, b) + 1);
        set(on ? [...values, ...range] : values.filter(n => !range.includes(n)));
        anchor.current = number;
        return;
      }
    }
    anchor.current = number;
    set(on ? [...values, number] : values.filter(n => n !== number));
  }
  function applyTyped() {
    const { numbers, invalid } = parseLaneRanges(typed);
    const ok = numbers.filter(n => selectable.includes(n)), skipped = numbers.filter(n => !selectable.includes(n));
    if (!typed.trim()) { setNote("Nhập dãy làn, ví dụ 1-10, 15, 20-25."); return; }
    onChange(ok);
    setNote([invalid.length ? `Không đọc được: ${invalid.join(", ")}.` : "", skipped.length ? `Bỏ qua làn không thu được: ${formatLaneRanges(skipped)}.` : "", !ok.length ? "Chưa có làn nào được chọn." : ""].filter(Boolean).join(" ") || undefined);
  }

  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" className="w-auto" disabled={!selectable.length} onClick={() => set(selectable)}>Chọn tất cả làn thu được</Button>
        <Button type="button" variant="secondary" className="w-auto" disabled={!values.length} onClick={() => set([])}>Bỏ chọn</Button>
        <label className="flex items-center gap-2 text-sm">
          <span className="whitespace-nowrap">Chọn theo dãy</span>
          <input className="omts-control w-44" inputMode="numeric" autoComplete="off" placeholder="1-10, 15, 20-25" value={typed} aria-describedby="harvest-lane-range-note"
            onChange={event => setTyped(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); applyTyped(); } }} />
        </label>
        <Button type="button" variant="secondary" className="w-auto" onClick={applyTyped}>Áp dụng</Button>
      </div>
      <p className="text-sm" role="status" aria-live="polite">
        <strong>Đã chọn {chosen.length}/{selectable.length} làn</strong>{chosen.length > 0 && <span className="text-text-muted"> · Làn {formatLaneRanges(chosen)}</span>}
      </p>
      <p id="harvest-lane-range-note" className="text-xs text-text-muted" role="status">{note ?? "Giữ Shift khi bấm để chọn cả dãy làn."}</p>
      {hidden > 0 && <label className="flex w-fit items-center gap-2 text-sm">
        <input type="checkbox" className="omts-check" checked={showAll} onChange={event => setShowAll(event.target.checked)} />Hiện cả làn không thu được ({hidden})
      </label>}
      {shown.length === 0
        ? <p className="rounded-control border border-border bg-surface-subtle p-3 text-sm text-text-muted">Chưa có làn nào thu hoạch được. Làn cần được thả giống và đang hoạt động.</p>
        : <div className={styles.grid} role="group" aria-label="Danh sách làn">
          {shown.map(({ lane, blocked, state }) => {
            const selected = values.includes(lane.laneNumber), text = `Làn ${lane.laneNumber} · ${cellLabel[state]}${blocked ? ` · ${blocked}` : ""}`;
            return <span key={lane.laneNumber} title={text}>
              <button type="button" className={styles.cell} data-state={state} aria-pressed={selected} aria-label={text} disabled={!!blocked}
                onClick={event => click(lane.laneNumber, event.shiftKey)}>{lane.laneNumber}</button>
            </span>;
          })}
        </div>}
      <div className={styles.legend} aria-label="Chú giải">
        {legendOrder.filter(state => showAll || state === "Growing" || state === "BeingHarvested").map(state => <span key={state}><i data-state={state} />{cellLabel[state]}</span>)}
        <span><i data-state="Selected" />Đang chọn</span>
      </div>
    </fieldset>
  );
}
