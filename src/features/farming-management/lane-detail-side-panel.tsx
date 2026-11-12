"use client";
import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import styles from "./lane-overview.module.css";

/**
 * The details of the opened lane, placed beside the lane strip (under it on narrow screens) instead of floating over a record dialog.
 * It shows the same content as the popover; focus stays on the lane so ticking several lanes by keyboard is not interrupted.
 */
export function LaneDetailSidePanel({ number, stateLabel, colorToken, onClose, children }: {
  number: number; stateLabel?: string; colorToken?: string; onClose(): void | boolean | Promise<boolean>; children: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null), titleId = useId();
  // Stacked under the strip, the panel can start below the visible part of a tall dialog.
  useEffect(() => { panel.current?.scrollIntoView?.({ block: "nearest" }); }, [number]);
  return <aside ref={panel} aria-labelledby={titleId} className={styles.sidePanel} data-lane-detail-panel onSubmit={event => event.stopPropagation()}>
    <div className={styles.popoverHeading} style={colorToken ? { "--lane-color": `var(${colorToken})` } as CSSProperties : undefined}>
      <strong id={titleId} className={styles.popoverTitle}>Làn <span className={styles.popoverBadge}>{number}</span></strong>
      {stateLabel && <span className={styles.statePill}>{stateLabel}</span>}
      <button key="close-lane" type="button" className={styles.selectButton} aria-label={`Đóng chi tiết làn ${number}`} onClick={() => void onClose()}>Đóng</button>
    </div>
    {children}
  </aside>;
}
