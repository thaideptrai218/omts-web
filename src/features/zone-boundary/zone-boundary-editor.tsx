"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { Field } from "@/features/operations/ui";
import type { ZoneBoundary } from "./boundary-contract";
import { BoundaryAreaTable } from "./boundary-area-table";
import { draftsFromReading } from "./corner-table";
import { useBoundaryDraft } from "./use-boundary-draft";
import { useBoundaryScan } from "./use-boundary-scan";
import styles from "./zone-boundary.module.css";

/** What a read of the map suggests for the zone form: the area ("Diện tích đề nghị", else the sum of the written khu areas) and the "Địa điểm" text. */
export type BoundaryPrefill = { areaHa: number | null; location: string | null };
/**
 * What the editor hands to its parent on every change.
 * `boundary` is the GeoJSON to save (null: none drawable yet); `blocked` means the draft has problems the backend would refuse;
 * `touched` means the user read a photo or edited something; `prefill` is the last read's suggestion and `readCount` goes up with each read,
 * so a parent applies a prefill once per read.
 */
export type BoundaryEditorValue = { boundary: ZoneBoundary | null; blocked: boolean; touched: boolean; reading: boolean; prefill: BoundaryPrefill | null; readCount: number };
/** Slot for a map preview of the boundary being edited (the maps screen supplies it); the editor itself draws no map. */
export type BoundaryPreviewSlot = (props: { boundary: ZoneBoundary | null }) => ReactNode;

/**
 * Reads the photographed sea-area licence map and lets the user review what was read: khu with their corner tables (Điểm, X, Y), the central
 * meridian, the written area against the area of the corners, and the problems that block saving or only deserve a second look.
 * `zoneId` binds the read to a zone; without it the read is zone-less (the create form). `initialBoundary` loads a saved boundary as the draft.
 */
export function ZoneBoundaryEditor({ zoneId, initialBoundary, disabled = false, onChange, preview }: {
  zoneId?: string; initialBoundary?: ZoneBoundary | null; disabled?: boolean; onChange(value: BoundaryEditorValue): void; preview?: BoundaryPreviewSlot;
}) {
  const draft = useBoundaryDraft(initialBoundary);
  const [prefill, setPrefill] = useState<BoundaryPrefill | null>(null), [readCount, setReadCount] = useState(0);
  const scan = useBoundaryScan({ zoneId, onReading(reading) {
    const drafts = draftsFromReading(reading);
    draft.applyReading(drafts);
    setPrefill({ areaHa: drafts.areaHa, location: drafts.location });
    setReadCount(count => count + 1);
  } });
  const input = useRef<HTMLInputElement>(null), latest = useRef(onChange);
  useEffect(() => { latest.current = onChange; });
  const reading = scan.phase === "reading", blocked = draft.review.blocking.length > 0;
  useEffect(() => { latest.current({ boundary: draft.boundary, blocked, touched: draft.touched, reading, prefill, readCount }); }, [draft.boundary, blocked, draft.touched, reading, prefill, readCount]);

  const corners = draft.areas.reduce((sum, area) => sum + area.corners.length, 0);
  return <div className={styles.editor}>
    <div className={styles.upload}>
      <input ref={input} type="file" accept="image/jpeg,image/png" className={styles.hiddenInput} aria-label="Ảnh sơ đồ cấp phép" tabIndex={-1} disabled={disabled || reading}
        onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void scan.start(file); }} />
      <Button type="button" variant="secondary" className="w-auto" disabled={disabled || reading} onClick={() => input.current?.click()}><InterfaceIcon name="upload" className="size-4" />Chọn ảnh sơ đồ</Button>
      <p>Ảnh JPEG hoặc PNG, tối đa 10 MB. Chỉ đọc các bảng tọa độ góc và bảng thông tin, không đọc hình vẽ. Kết quả luôn được đối chiếu và sửa được trước khi lưu.</p>
    </div>
    {reading && <div role="status" className={styles.progress}>
      <span className={styles.spinner} aria-hidden="true" /><span>Đang đọc ảnh sơ đồ{scan.elapsedMs > 0 ? `, đã chờ ${Math.round(scan.elapsedMs / 1000)} giây` : ""}. Việc này có thể mất tới 2 phút.</span>
      <Button type="button" variant="secondary" className="w-auto" onClick={scan.cancel}>Hủy</Button>
    </div>}
    {scan.phase === "failed" && <div role="alert" className={styles.errorBox}>
      <p>{scan.error}</p>
      {scan.canRetry && <Button type="button" variant="secondary" className="w-auto" disabled={disabled} onClick={scan.retry}>Thử lại</Button>}
    </div>}
    {draft.areas.length > 0 && <div className={styles.meridian}>
      <Field label="Kinh tuyến trục (VN-2000)" value={draft.meridianInput} disabled={disabled} aria-invalid={!draft.meridianValid || undefined} onChange={event => draft.changeMeridian(event.target.value)} />
      <small>{"Ví dụ 107°45' cho Quảng Ninh. Đổi khi sơ đồ ghi kinh tuyến khác."}</small>
    </div>}
    {draft.review.blocking.length > 0 && <ul role="alert" aria-label="Cần sửa trước khi lưu" className={`${styles.issues} ${styles.blocking}`}>{draft.review.blocking.map((issue, index) => <li key={index}>{issue.message}</li>)}</ul>}
    {draft.review.warnings.length > 0 && <ul role="status" aria-label="Nên kiểm tra lại" className={`${styles.issues} ${styles.warning}`}>{draft.review.warnings.map((issue, index) => <li key={index}>{issue.message}</li>)}</ul>}
    <BoundaryAreaTable draft={draft} disabled={disabled} />
    <div className={styles.toolbar}>
      <p className={styles.summary}>{draft.areas.length > 0 ? <><strong>{draft.areas.length} vùng</strong>, {corners} điểm góc</> : "Chưa có vùng nào. Chọn ảnh sơ đồ hoặc thêm vùng bằng tay."}</p>
      <button type="button" className={styles.linkButton} disabled={disabled || !draft.canAddArea} onClick={draft.addArea}><InterfaceIcon name="add" className="size-4" />Thêm vùng</button>
    </div>
    {preview && draft.boundary && !blocked && preview({ boundary: draft.boundary })}
  </div>;
}
