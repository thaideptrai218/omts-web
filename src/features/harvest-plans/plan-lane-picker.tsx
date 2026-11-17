"use client";
import type { EligibleLane } from "./contracts";
import { laneSelectable } from "./plan-logic";
import styles from "./plans.module.css";

/** What a lane that cannot be chosen is doing: waiting in another open plan (named) or already harvested in the cycle. */
const laneNote = (lane: EligibleLane, ownPlanCode: string | undefined) =>
  lane.state === "Harvested" ? "đã thu hoạch" : lane.state === "InAnotherPlan" && lane.planCode !== ownPlanCode ? `trong ${lane.planCode ?? "kế hoạch khác"}` : "";

/**
 * The lanes of a raft as checkboxes (they come with the eligible raft: every lane that can still be harvested, with its state). A lane that is waiting in another
 * open plan or was already harvested is shown but disabled; one already chosen stays tickable so a stale choice can be taken back.
 */
export function PlanLanePicker({ lanes, ownPlanCode, value, onChange, disabled, label }: { lanes: readonly EligibleLane[]; ownPlanCode?: string; value: readonly number[]; onChange(lanes: number[]): void; disabled?: boolean; label: string }) {
  const shown = [...lanes].sort((a, b) => a.laneNumber - b.laneNumber);
  if (!shown.length) return <p className={styles.hint}>Bè chưa có luống thu hoạch được.</p>;
  const toggle = (lane: number, checked: boolean) => onChange(checked ? [...value, lane].sort((a, b) => a - b) : value.filter((item) => item !== lane));
  return <div className={styles.laneBox} role="group" aria-label={label}>{shown.map((lane) => {
    const checked = value.includes(lane.laneNumber), usable = laneSelectable(lane, ownPlanCode, value), off = disabled || !usable;
    const note = laneNote(lane, ownPlanCode);
    return <label key={lane.laneNumber} className={styles.lane} data-checked={checked} data-disabled={off} title={usable ? undefined : "Luống này chưa chọn được"}>
      <input type="checkbox" checked={checked} disabled={off} onChange={(event) => toggle(lane.laneNumber, event.target.checked)} />Luống {lane.laneNumber}{note && <small>{note}</small>}
    </label>;
  })}</div>;
}
