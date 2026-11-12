"use client";
import { useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { compressLaneNumbers } from "./lane-ranges";
import styles from "./lane-overview.module.css";

export type LaneOverviewItem = { laneNumber: number; state?: string; statusId?: number; isDamaged?: boolean; isOutOfService?: boolean; disabled?: boolean };
const labels: Record<string, string> = { NotSeeded: "Chưa thả", Growing: "Đang nuôi", BeingHarvested: "Đang thu", Harvested: "Đã thu", Damaged: "Hỏng", OutOfService: "Ngừng hoạt động", Available: "Đang sử dụng" };
export function laneOverviewState(lane: LaneOverviewItem): string {
  if (lane.isOutOfService || lane.statusId === 2002 || lane.state === "OutOfService") return "OutOfService";
  if (lane.isDamaged) return "Damaged";
  return lane.state && labels[lane.state] ? lane.state : "Available";
}

/** One physical lane has one numbered cell. Details are rendered once, below the whole grid. */
export function LaneOverview({ lanes, selected, opened, onLaneClick, label = "Sơ đồ làn", children }: {
  lanes: readonly LaneOverviewItem[]; selected?: readonly number[]; opened?: number;
  onLaneClick?(laneNumber: number, event: MouseEvent<HTMLButtonElement>): void; label?: string; children?: ReactNode;
}) {
  const [query, setQuery] = useState(""), [filter, setFilter] = useState("");
  const grid = useRef<HTMLDivElement>(null), searchId = useId();
  const sorted = [...lanes].sort((a, b) => a.laneNumber - b.laneNumber);
  const states = [...new Set(sorted.map(laneOverviewState))];
  const found = Number(query), match = sorted.find(lane => lane.laneNumber === found);
  const visible = sorted.filter(lane => !filter || laneOverviewState(lane) === filter || lane.laneNumber === found);
  function find(value: string) {
    setQuery(value.replace(/\D/g, "").slice(0, 3));
    const number = Number(value);
    requestAnimationFrame(() => grid.current?.querySelector<HTMLElement>(`[data-lane="${number}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" }));
  }
  return <section className={styles.overview} aria-label={label}>
    <div className={styles.toolbar}><strong>{label} <span>({lanes.length})</span></strong><label htmlFor={searchId} className={styles.search}><span className="sr-only">Tìm làn số</span><input id={searchId} className="omts-control" inputMode="numeric" placeholder="Tìm làn số…" value={query} onChange={event => find(event.target.value)} /></label></div>
    <div className={styles.filters} aria-label="Lọc tình trạng làn"><button type="button" aria-pressed={!filter} onClick={() => setFilter("")}>Tất cả · {lanes.length}</button>{states.map(state => <button key={state} type="button" data-state={state} aria-pressed={filter === state} onClick={() => setFilter(filter === state ? "" : state)}><i />{labels[state]} · {sorted.filter(lane => laneOverviewState(lane) === state).length}</button>)}</div>
    {query && !match && <p role="status" className={styles.note}>Không có làn số {query}.</p>}
    {states.length > 0 && <p className={styles.summary}>{states.map(state => `Làn ${compressLaneNumbers(sorted.filter(lane => laneOverviewState(lane) === state).map(lane => lane.laneNumber))}: ${labels[state]}`).join(" · ")}</p>}
    <div ref={grid} className={styles.grid} role="group" aria-label={label}>
      {visible.map(lane => { const state = laneOverviewState(lane), active = selected?.includes(lane.laneNumber) ?? opened === lane.laneNumber;
        return <button key={lane.laneNumber} type="button" data-lane={lane.laneNumber} data-state={state} data-found={lane.laneNumber === found || undefined} data-active={active || undefined} aria-label={`Làn ${lane.laneNumber}: ${labels[state]}`} title={`Làn ${lane.laneNumber}: ${labels[state]}`} aria-pressed={selected ? active : undefined} aria-expanded={onLaneClick && !selected ? active : undefined} disabled={lane.disabled || !onLaneClick} onClick={event => onLaneClick?.(lane.laneNumber, event)}>{lane.laneNumber}{active && <span aria-hidden="true">✓</span>}</button>;
      })}
    </div>
    {!lanes.length && <p className={styles.note}>Chưa có thông tin làn.</p>}
    {children && <div className={styles.detail}>{children}</div>}
  </section>;
}
