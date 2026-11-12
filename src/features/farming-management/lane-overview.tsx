"use client";
import { useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { compressLaneNumbers } from "./lane-ranges";
import styles from "./lane-overview.module.css";

export type LaneOverviewItem = { laneNumber: number; state?: string; statusId?: number; isDamaged?: boolean; isOutOfService?: boolean; disabled?: boolean; description?: string };
const labels: Record<string, string> = { NotSeeded: "Chưa thả", Growing: "Đang nuôi", BeingHarvested: "Đang thu", Harvested: "Đã thu", Damaged: "Hỏng", OutOfService: "Ngừng hoạt động", Available: "Đang sử dụng" };
export function laneOverviewState(lane: LaneOverviewItem): string {
  if (lane.isOutOfService || lane.statusId === 2002 || lane.state === "OutOfService") return "OutOfService";
  if (lane.isDamaged) return "Damaged";
  return lane.state && labels[lane.state] ? lane.state : "Available";
}

/** One physical lane has one numbered cell. Details are rendered once, below the whole grid. */
export function LaneOverview({ lanes, selected, opened, onLaneClick, label = "Sơ đồ làn", children, loading = false, emptyMessage = "Chưa có thông tin làn." }: {
  lanes: readonly LaneOverviewItem[]; selected?: readonly number[]; opened?: number;
  onLaneClick?(laneNumber: number, event: MouseEvent<HTMLButtonElement>): void; label?: string; children?: ReactNode; loading?: boolean; emptyMessage?: string;
}) {
  const [query, setQuery] = useState(""), [filter, setFilter] = useState("");
  const grid = useRef<HTMLDivElement>(null), searchId = useId();
  const sorted = [...lanes].sort((a, b) => a.laneNumber - b.laneNumber);
  const states = ["NotSeeded", "Growing", "BeingHarvested", "Harvested", "Damaged", "OutOfService", "Available"].filter(state => sorted.some(lane => laneOverviewState(lane) === state));
  const activeFilter = states.includes(filter) ? filter : "";
  const found = Number(query), match = sorted.find(lane => lane.laneNumber === found);
  const visible = sorted.filter(lane => !activeFilter || laneOverviewState(lane) === activeFilter || lane.laneNumber === found);
  function find(value: string) {
    const clean = value.replace(/\D/g, "");
    setQuery(clean);
    const number = Number(clean);
    // Scroll only the map, so finding a lane does not jump the surrounding dialog/page.
    requestAnimationFrame(() => {
      const cell = grid.current?.querySelector<HTMLElement>(`[data-lane="${number}"]`);
      if (grid.current && cell) grid.current.scrollTop = Math.max(0, cell.offsetTop - (grid.current.querySelector<HTMLElement>("header")?.offsetHeight ?? 0) - 8);
    });
  }
  return <section className={styles.overview} aria-label={label} aria-busy={loading}>
    <div ref={grid} className={styles.viewport}>
    <header className={styles.sticky}>
      <div className={styles.toolbar}><strong>{label} <span>({lanes.length})</span></strong><label htmlFor={searchId} className={styles.search}><span>Tìm làn số</span><input id={searchId} className="omts-control" inputMode="numeric" autoComplete="off" placeholder="Tìm làn số…" disabled={loading || !lanes.length} value={query} onChange={event => find(event.target.value)} /></label></div>
      <div className={styles.filters} aria-label="Lọc tình trạng làn"><button type="button" aria-pressed={!activeFilter} disabled={loading} onClick={() => setFilter("")}>Tất cả <b>{lanes.length}</b></button>{states.map(state => <button key={state} type="button" data-state={state} disabled={loading} aria-pressed={activeFilter === state} onClick={() => setFilter(activeFilter === state ? "" : state)}><i aria-hidden="true" />{labels[state]} <b>{sorted.filter(lane => laneOverviewState(lane) === state).length}</b></button>)}</div>
      {!!lanes.length && <p className={styles.summary} role="status">{query && !match ? `Không có làn số ${query}.` : `Hiển thị ${visible.length}/${lanes.length} làn · Làn ${compressLaneNumbers(visible.map(lane => lane.laneNumber))}`}{!!selected?.length && ` · Đã chọn ${selected.length} làn`}</p>}
    </header>
    {loading ? <div className={styles.grid} role="status"><span className="sr-only">Đang tải sơ đồ làn…</span>{Array.from({ length: 20 }, (_, index) => <div key={index} className={`omts-skeleton ${styles.skeleton}`} aria-hidden="true" />)}</div> : !lanes.length ? <div className={styles.empty} role="status"><strong>Chưa có làn để hiển thị</strong><p>{emptyMessage}</p></div> : <div className={styles.grid} role="group" aria-label={label}>
      {visible.map(lane => { const state = laneOverviewState(lane), active = selected?.includes(lane.laneNumber) ?? opened === lane.laneNumber;
        const description = `Làn ${lane.laneNumber}: ${labels[state]}${lane.description ? ` · ${lane.description}` : ""}`;
        return <button key={lane.laneNumber} type="button" data-lane={lane.laneNumber} data-state={state} data-found={lane.laneNumber === found || undefined} data-active={active || undefined} aria-label={description} title={description} aria-pressed={selected ? active : undefined} aria-expanded={onLaneClick && !selected ? active : undefined} disabled={lane.disabled || !onLaneClick} onClick={event => onLaneClick?.(lane.laneNumber, event)}>{lane.laneNumber}{active && <span aria-hidden="true">✓</span>}</button>;
      })}
    </div>}
    </div>
    {children && <div className={styles.detail}>{children}</div>}
  </section>;
}
