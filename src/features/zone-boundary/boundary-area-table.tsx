"use client";
import { useState } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { areaMatches, gridAreaHa, MAX_AREA_NAME, MAX_CORNER_LABEL, type AreaDraft } from "./boundary-geometry";
import type { BoundaryDraft } from "./use-boundary-draft";
import styles from "./zone-boundary.module.css";

const ha = (value: number | null) => value === null ? "—" : `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ha`;
const nameOf = (area: AreaDraft) => area.name.trim() || "Vùng chưa đặt tên";

/** One khu: name, the written area against the area of its corners, and its corner rows (Điểm, X, Y). */
function AreaCard({ area, index, draft, disabled }: { area: AreaDraft; index: number; draft: BoundaryDraft; disabled: boolean }) {
  const grid = gridAreaHa(area), mismatch = areaMatches(area.writtenAreaHa, grid) === false;
  const problems = draft.review.blocking.filter(issue => issue.areaKey === area.key);
  const badCorners = new Set(problems.flatMap(issue => issue.cornerKey ? [issue.cornerKey] : []));
  const name = nameOf(area);
  // Starts open for the first khu and any with a problem; after that the user decides (a card never folds while its problem is being fixed).
  const [open, setOpen] = useState(index === 0 || problems.length > 0);
  return <details className={styles.card} open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>
      <span className={styles.cardHead}>
        <strong>{name}</strong>
        <small>{area.corners.length} điểm góc · Ghi trên sơ đồ: {ha(area.writtenAreaHa)} · Tính từ tọa độ: {ha(grid)}</small>
      </span>
      {mismatch && <StatusPill tone="warning">Lệch diện tích</StatusPill>}
      {problems.length > 0 && <StatusPill tone="danger">Cần sửa</StatusPill>}
      <InterfaceIcon name="chevron-down" />
    </summary>
    <div className={styles.cardBody}>
      <label className={`${styles.nameRow} block text-xs font-medium text-text-muted`}>Tên vùng
        <input className="omts-control mt-1" value={area.name} maxLength={MAX_AREA_NAME} disabled={disabled} onChange={event => draft.renameArea(area.key, event.target.value)} />
      </label>
      <div className={styles.tableWrap} role="group" tabIndex={0} aria-label={`Điểm góc của ${name}`}>
        <table className={styles.table}>
          <thead><tr><th className={styles.label}>Điểm</th><th>X (bắc), m</th><th>Y (đông), m</th><th className={styles.action}><span className="sr-only">Xóa điểm</span></th></tr></thead>
          <tbody>{area.corners.map((corner, row) => {
            const position = corner.label.trim() || String(row + 1), bad = badCorners.has(corner.key);
            return <tr key={corner.key}>
              <td><input className="omts-control" aria-label={`Tên điểm ${row + 1} của ${name}`} value={corner.label} maxLength={MAX_CORNER_LABEL} disabled={disabled} aria-invalid={bad || undefined} onChange={event => draft.editCorner(area.key, corner.key, { label: event.target.value })} /></td>
              <td><input className="omts-control" inputMode="decimal" aria-label={`X của điểm ${position}, ${name}`} value={corner.x} disabled={disabled} aria-invalid={bad || undefined} onChange={event => draft.editCorner(area.key, corner.key, { x: event.target.value })} /></td>
              <td><input className="omts-control" inputMode="decimal" aria-label={`Y của điểm ${position}, ${name}`} value={corner.y} disabled={disabled} aria-invalid={bad || undefined} onChange={event => draft.editCorner(area.key, corner.key, { y: event.target.value })} /></td>
              <td className={styles.action}><button type="button" className={styles.iconButton} aria-label={`Xóa điểm ${position} của ${name}`} title="Xóa điểm" disabled={disabled} onClick={() => draft.removeCorner(area.key, corner.key)}><InterfaceIcon name="trash" className="size-4" /></button></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <div className={styles.cardFoot}>
        <button type="button" className={styles.linkButton} disabled={disabled || !draft.canAddCorner(area)} onClick={() => draft.addCorner(area.key)}><InterfaceIcon name="add" className="size-4" />Thêm điểm góc</button>
        <button type="button" className={`${styles.linkButton} ${styles.danger}`} disabled={disabled} onClick={() => draft.removeArea(area.key)}><InterfaceIcon name="trash" className="size-4" />Xóa {name}</button>
      </div>
    </div>
  </details>;
}

/** Every khu of the draft as a collapsible card; the first (and any with a problem) starts open. */
export function BoundaryAreaTable({ draft, disabled = false }: { draft: BoundaryDraft; disabled?: boolean }) {
  if (draft.areas.length === 0) return null;
  return <div className={styles.areas}>{draft.areas.map((area, index) => <AreaCard key={area.key} area={area} index={index} draft={draft} disabled={disabled} />)}</div>;
}
