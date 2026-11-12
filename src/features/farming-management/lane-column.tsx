"use client";
import { useRef, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { laneProgressDisplay } from "./lane-progress-display";
import type { LaneOverviewItem } from "./lane-overview";
import styles from "./lane-overview.module.css";

export function LaneColumn({ lane, active, expanded, found, selecting, disabled, side = false, onClick, onToggle }: {
  /** `active` = ticked (chosen); `expanded` = its details are open (own marker). `side`: the details are a panel, not a popup. */
  lane: LaneOverviewItem; active: boolean; expanded: boolean; found: boolean; selecting: boolean; disabled: boolean; side?: boolean;
  onClick(event: MouseEvent<HTMLButtonElement>): void; onToggle(shift: boolean): void;
}) {
  const shift = useRef(false), display = laneProgressDisplay(lane);
  const description = `Làn ${lane.laneNumber}: ${display.description}${lane.description ? ` · ${lane.description}` : ""}`;
  function navigate(event: KeyboardEvent<HTMLElement>) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const columns = [...event.currentTarget.closest("[data-lane-columns]")!.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)")];
    const current = columns.indexOf(event.target as HTMLElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? columns.length - 1 : Math.min(columns.length - 1, Math.max(0, current + delta));
    const target = columns[next], scroller = target?.closest<HTMLElement>("[data-lane-scroller]");
    target?.focus({ preventScroll: true });
    if (scroller && target) {
      const rect = target.getBoundingClientRect(), box = scroller.getBoundingClientRect();
      scroller.scrollBy({ left: rect.left < box.left ? rect.left - box.left - 12 : rect.right > box.right ? rect.right - box.right + 12 : 0 });
    }
  }
  // DOM order stays number, percent, bar, state (the lane number is the first element); CSS `order` shows the percent above the bar and the number in a badge below it.
  const contents = <>
    <span className={styles.laneNumber}>{lane.laneNumber}{active && <span aria-hidden="true"> ✓</span>}</span>
    <span className={styles.percent} aria-hidden="true">{display.percentLabel}</span>
    <span className={styles.track} aria-hidden="true">
      {display.state === "BeingHarvested" && <span className={styles.seededFill} style={{ height: `${display.seededPercent}%` }} />}
      {display.fillPercent !== null && <span className={styles.fill} style={{ height: `${display.fillPercent}%` }} />}
    </span>
    <span className={styles.stateLabel}>{display.label}</span>
  </>;
  const props = { "data-lane": lane.laneNumber, "data-state": display.state, "data-active": active || undefined, "data-opened": expanded || undefined, "data-found": found || undefined,
    style: { "--lane-color": `var(${display.colorToken})` } as CSSProperties, title: description, onKeyDown: navigate };
  return selecting ? <label className={styles.column} {...props}>
    <input type="checkbox" className={`omts-check ${styles.laneCheck}`} aria-label={description} checked={active} disabled={disabled} onClick={event => { shift.current = event.shiftKey; }} onChange={() => { onToggle(shift.current); shift.current = false; }} />{contents}
  </label> : <button type="button" className={styles.column} {...props} aria-label={description} aria-pressed={active} aria-expanded={expanded} aria-haspopup={side ? undefined : "dialog"} disabled={disabled} onClick={onClick}>{contents}</button>;
}
