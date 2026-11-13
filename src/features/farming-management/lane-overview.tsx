"use client";
import { useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { compressLaneNumbers } from "./lane-ranges";
import { toggleLaneSelection } from "./lane-selection";
import { laneProgressDisplay, laneStateLabels, type LaneProgressFacts } from "./lane-progress-display";
import type { LaneProgressMetadata } from "./lane-progress-contracts";
import { LaneColumn } from "./lane-column";
import { LaneFilterChips } from "./lane-filter-chips";
import { LaneSummaryBar } from "./lane-summary-bar";
import { LaneDetailPopover } from "./lane-detail-popover";
import { LaneDetailSidePanel } from "./lane-detail-side-panel";
import styles from "./lane-overview.module.css";

export type LaneOverviewItem = Omit<LaneProgressFacts, "state"> & Partial<Omit<LaneProgressMetadata, "state">> & { state?: string | number | null; disabled?: boolean; description?: string };
export const laneOverviewState = (lane: LaneOverviewItem) => laneProgressDisplay(lane).state;
type Props = {
  lanes: readonly LaneOverviewItem[]; selected?: readonly number[]; opened?: number;
  onLaneClick?(laneNumber: number, event: MouseEvent<HTMLButtonElement>): void | boolean | Promise<boolean>;
  onCloseLane?(): void | boolean | Promise<boolean>;
  label?: string; children?: ReactNode; loading?: boolean; emptyMessage?: string;
  renderLaneDetails?(lane: LaneOverviewItem): ReactNode;
  onSelectionChange?(numbers: number[]): void; eligibleLaneNumbers?: readonly number[];
  selectionAction?: ReactNode; selectionDisabled?: boolean;
  onDirty?(dirty: boolean): void; onPending?(pending: boolean): void;
  /** "side": the opened lane's details sit beside the strip (under it on narrow screens) instead of a popover; used inside record dialogs. */
  detailPlacement?: "popover" | "side";
};

/** Native horizontal scrolling keeps 100+ columns responsive, without a render on scroll. Only one detail is mounted. */
export function LaneOverview(props: Props) {
  const { lanes, selected, onLaneClick, label = "Sơ đồ làn", children, loading = false, emptyMessage = "Chưa có thông tin làn.",
    onSelectionChange, eligibleLaneNumbers, selectionAction, selectionDisabled = false, renderLaneDetails, detailPlacement = "popover" } = props;
  const side = detailPlacement === "side";
  const [query, setQuery] = useState(""), [filter, setFilter] = useState("");
  const [selecting, setSelecting] = useState(false), [localSelection, setLocalSelection] = useState<number[]>([]);
  const [localOpened, setLocalOpened] = useState<number>(), [anchor, setAnchor] = useState<HTMLElement>(), [slot, setSlot] = useState<HTMLElement | null>(null);
  const selectionAnchor = useRef<number | undefined>(undefined), viewport = useRef<HTMLDivElement>(null), searchId = useId();
  const opened = Object.hasOwn(props, "opened") ? props.opened : localOpened;
  const sorted = [...lanes].sort((a, b) => a.laneNumber - b.laneNumber);
  const counts = new Map<string, number>();
  for (const lane of sorted) { const state = laneOverviewState(lane); counts.set(state, (counts.get(state) ?? 0) + 1); }
  const states = (Object.keys(laneStateLabels) as (keyof typeof laneStateLabels)[]).filter(state => counts.has(state));
  const activeFilter = states.includes(filter as keyof typeof laneStateLabels) ? filter : "";
  const found = Number(query), match = sorted.find(lane => lane.laneNumber === found);
  const visible = sorted.filter(lane => !activeFilter || laneOverviewState(lane) === activeFilter || lane.laneNumber === found);
  const eligible = sorted.filter(lane => !lane.disabled && (!eligibleLaneNumbers || eligibleLaneNumbers.includes(lane.laneNumber))).map(lane => lane.laneNumber);
  const chosen = (onSelectionChange ? selected ?? [] : localSelection).filter(number => eligible.includes(number));
  const updateSelection = (numbers: number[]) => { if (onSelectionChange) onSelectionChange(numbers); else setLocalSelection(numbers); };
  function toggle(number: number, shift: boolean) {
    updateSelection(toggleLaneSelection(chosen, visible.filter(lane => eligible.includes(lane.laneNumber)).map(lane => lane.laneNumber), number, selectionAnchor.current, shift));
    selectionAnchor.current = number;
  }
  function find(value: string) {
    const clean = value.replace(/\D/g, ""); setQuery(clean);
    requestAnimationFrame(() => {
      const cell = viewport.current?.querySelector<HTMLElement>(`[data-lane="${Number(clean)}"]`);
      if (viewport.current && cell) viewport.current.scrollTo({ left: Math.max(0, cell.offsetLeft - 12) });
    });
  }
  async function close() {
    if (props.onCloseLane && await props.onCloseLane() === false) return false;
    setLocalOpened(undefined); return true;
  }
  const openedLane = !selecting && !loading ? visible.find(lane => lane.laneNumber === opened) : undefined;
  // With a selection supplied, the tick means "chosen"; the opened lane gets its own marker so an unticked lane never looks ticked.
  const isActive = (number: number) => selecting ? chosen.includes(number) : selected ? selected.includes(number) : opened === number;
  const detail = openedLane && <>
    <p className={styles.facts}>{laneProgressDisplay(openedLane).description}</p>
    {openedLane.description && <p className={styles.facts}>{openedLane.description}</p>}
    {renderLaneDetails?.(openedLane)}{children}
  </>;
  return <section className={styles.overview} aria-label={label} aria-busy={loading} data-lane-overview>
    <header className={styles.sticky}>
      <div className={styles.toolbar}><strong>{label} <span>({lanes.length})</span></strong><label htmlFor={searchId} className={styles.search}><span>Tìm làn số</span><input id={searchId} className="omts-control" inputMode="numeric" autoComplete="off" placeholder="Tìm làn số…" disabled={loading || !lanes.length} value={query} onChange={event => find(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); find(query); } }} /></label>
        <button key={selecting ? "exit-lane-selection" : "enter-lane-selection"} type="button" className={styles.selectButton} aria-pressed={selecting} disabled={loading || selectionDisabled || !lanes.length} onClick={async () => { if (!await close()) return; if (selecting) updateSelection([]); setSelecting(current => !current); selectionAnchor.current = undefined; }}>{selecting ? "Thoát chế độ chọn" : "Chọn"}</button></div>
      {selecting && <div className={styles.selectionBar}><label><input type="checkbox" className="omts-check" checked={!!eligible.length && chosen.length === eligible.length} ref={element => { if (element) element.indeterminate = chosen.length > 0 && chosen.length < eligible.length; }} disabled={loading || selectionDisabled || !eligible.length} onChange={event => updateSelection(event.target.checked ? eligible : [])} />Chọn tất cả</label><span role="status">Đã chọn {chosen.length} làn</span>{selectionAction}<span className={styles.selectionHint}>Giữ Shift để chọn một dải làn.</span></div>}
      <LaneSummaryBar counts={counts} total={lanes.length} />
      <div className={styles.filterRow}>
        <LaneFilterChips states={states} counts={counts} total={lanes.length} active={activeFilter} loading={loading} onSelect={async state => { if (await close()) setFilter(state); }} />
        {!!lanes.length && <p className={styles.summary} role="status">{query && !match ? `Không có làn số ${query}.` : `Hiển thị ${visible.length}/${lanes.length} làn · Làn ${compressLaneNumbers(visible.map(lane => lane.laneNumber))}`}{!!selected?.length && ` · Đã chọn ${selected.length} làn`}</p>}
      </div>
    </header>
    <div className={styles.body} data-detail={side && openedLane ? "side" : undefined}>
    <div className={styles.stripArea}>
    <div ref={viewport} className={styles.viewport} data-lane-scroller>
      {loading ? <div className={styles.columns} role="status"><span className="sr-only">Đang tải sơ đồ làn…</span>{Array.from({ length: 12 }, (_, index) => <div key={index} className={`omts-skeleton ${styles.skeleton}`} aria-hidden="true" />)}</div>
        : !lanes.length ? <div className={styles.empty} role="status"><strong>Chưa có làn để hiển thị</strong><p>{emptyMessage}</p></div>
          : <div className={styles.columns} role="group" aria-label={label} data-lane-columns>{visible.map(lane => <LaneColumn key={lane.laneNumber} lane={lane} found={lane.laneNumber === found}
            active={isActive(lane.laneNumber)} expanded={opened === lane.laneNumber} side={side} selecting={selecting}
            disabled={selecting ? selectionDisabled || !eligible.includes(lane.laneNumber) : !!lane.disabled}
            onToggle={shift => toggle(lane.laneNumber, shift)} onClick={async event => { const target = event.currentTarget; if (await onLaneClick?.(lane.laneNumber, event) === false) return; setAnchor(target); setLocalOpened(current => current === lane.laneNumber && !side ? undefined : lane.laneNumber); }} />)}</div>}
    </div>
    {!!lanes.length && <p className={styles.legend}><span>Kéo ngang hoặc dùng phím ← → để xem làn</span><span>Chiều cao cột = % tiến độ</span><span><i aria-hidden="true" />Ngừng hoạt động</span></p>}
    </div>
    {/* The record form that hosts the strip is itself a <form>: the panel (which holds its own forms) is mounted through a portal into this slot so the React tree has no nested forms. */}
    <div ref={setSlot} className={styles.sideSlot} />
    {side && openedLane && slot && createPortal(<LaneDetailSidePanel number={openedLane.laneNumber} stateLabel={laneProgressDisplay(openedLane).label} colorToken={laneProgressDisplay(openedLane).colorToken} onClose={close}>{detail}</LaneDetailSidePanel>, slot)}
    </div>
    {!side && openedLane && anchor && <LaneDetailPopover anchor={anchor} number={openedLane.laneNumber} stateLabel={laneProgressDisplay(openedLane).label} colorToken={laneProgressDisplay(openedLane).colorToken} onClose={close}>{detail}</LaneDetailPopover>}
  </section>;
}
