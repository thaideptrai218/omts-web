import { laneStateLabels, type LaneDisplayState } from "./lane-progress-display";
import styles from "./lane-overview.module.css";

/** State filter as pill chips with counts; it doubles as the colour legend (one chip per state present on the raft). */
export function LaneFilterChips({ states, counts, total, active, loading, onSelect }: {
  states: readonly LaneDisplayState[]; counts: ReadonlyMap<string, number>; total: number; active: string; loading: boolean; onSelect(state: string): void;
}) {
  return <div className={styles.filters} aria-label="Lọc tình trạng làn">
    <button key="all" type="button" aria-pressed={!active} disabled={loading} onClick={() => onSelect("")}>Tất cả <b>{total}</b></button>
    {states.map(state => <button key={state} type="button" data-state={state} disabled={loading} aria-pressed={active === state} onClick={() => onSelect(active === state ? "" : state)}>
      <i aria-hidden="true" />{laneStateLabels[state]} <b>{counts.get(state)}</b>
    </button>)}
  </div>;
}
