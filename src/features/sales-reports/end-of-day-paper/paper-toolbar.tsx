"use client";
import { useState, type KeyboardEvent } from "react";
import { InterfaceIcon, type InterfaceIconName } from "@/components/ui/interface-icon";
import { ExportMenu, type ExportFormat } from "../export-menu";
import { clampPage } from "./paginate";
import styles from "./paper.module.css";

export type PaperToolbarProps = Readonly<{
  page: number; pageCount: number; onPage(page: number): void;
  canBack: boolean; canForward: boolean; onBack(): void; onForward(): void; onRefresh(): void;
  preview: boolean; onPreview(): void;
  canDownload: boolean; downloading?: boolean; onDownload(format: ExportFormat): void; onPrint(): void;
  zoom: number; canZoomIn: boolean; canZoomOut: boolean; onZoomIn(): void; onZoomOut(): void;
  findOpen: boolean; onFind(): void; fullscreen: boolean; onFullscreen(): void;
  /** Mở/thu gọn tất cả dòng ⊞/⊟; không truyền = báo cáo không có dòng nào mở được. */
  expandAll?: Readonly<{ open: boolean; onToggle(): void }>;
}>;

function Tool({ icon, label, onClick, disabled, pressed }: Readonly<{ icon: InterfaceIconName; label: string; onClick(): void; disabled?: boolean; pressed?: boolean }>) {
  return <button type="button" className={styles.tool} aria-label={label} title={label} disabled={disabled} aria-pressed={pressed} onClick={onClick}><InterfaceIcon name={icon} /></button>;
}

/** Ô số trang "n / N": gõ số rồi Enter (hoặc rời ô) để tới trang; số ngoài phạm vi được kéo về trang gần nhất, chữ không phải số bị bỏ. */
function PageBox({ page, pageCount, onPage }: Readonly<{ page: number; pageCount: number; onPage(page: number): void }>) {
  const [draft, setDraft] = useState<{ source: number; text: string }>();
  const text = draft?.source === page ? draft.text : String(page);
  const commit = () => {
    const typed = Number(text);
    setDraft(undefined);
    if (text.trim() !== "" && Number.isFinite(typed)) onPage(clampPage(typed, pageCount));
  };
  const onKey = (event: KeyboardEvent) => { if (event.key === "Enter") { event.preventDefault(); commit(); } else if (event.key === "Escape") setDraft(undefined); };
  return (
    <span className={styles.cluster}>
      <input className={styles.pageInput} inputMode="numeric" aria-label="Số trang" value={text} onChange={(event) => setDraft({ source: page, text: event.target.value.replace(/\D/g, "").slice(0, 5) })} onBlur={commit} onKeyDown={onKey} />
      <span className={styles.pageTotal} aria-live="polite">/ {pageCount}</span>
    </span>
  );
}

/** Thanh công cụ của trang báo cáo: lịch sử, làm mới, chuyển trang, xem trước khi in, tải xuống, in, thu phóng, tìm và toàn màn hình. Mỗi nút có tên tiếng Việt. */
export function PaperToolbar(props: PaperToolbarProps) {
  const { page, pageCount } = props;
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Công cụ trang báo cáo">
      <span className={styles.cluster}>
        <Tool icon="undo" label="Quay lại" disabled={!props.canBack} onClick={props.onBack} />
        <Tool icon="redo" label="Tới" disabled={!props.canForward} onClick={props.onForward} />
        <Tool icon="refresh" label="Làm mới" onClick={props.onRefresh} />
      </span>
      <span className={styles.cluster}>
        <Tool icon="first" label="Trang đầu" disabled={page <= 1} onClick={() => props.onPage(1)} />
        <Tool icon="chevron-left" label="Trang trước" disabled={page <= 1} onClick={() => props.onPage(page - 1)} />
        <PageBox page={page} pageCount={pageCount} onPage={props.onPage} />
        <Tool icon="chevron-right" label="Trang sau" disabled={page >= pageCount} onClick={() => props.onPage(page + 1)} />
        <Tool icon="last" label="Trang cuối" disabled={page >= pageCount} onClick={() => props.onPage(pageCount)} />
      </span>
      <span className={styles.cluster}>
        <Tool icon="eye" label="Xem trước khi in" pressed={props.preview} onClick={props.onPreview} />
        <ExportMenu onPick={props.onDownload} pending={props.downloading} disabled={!props.canDownload} />
        <Tool icon="print" label="In" onClick={props.onPrint} />
      </span>
      <span className={styles.cluster}>
        <Tool icon="zoom-out" label="Thu nhỏ" disabled={!props.canZoomOut} onClick={props.onZoomOut} />
        <span className={styles.zoomText} aria-live="polite">{props.zoom}%</span>
        <Tool icon="zoom-in" label="Phóng to" disabled={!props.canZoomIn} onClick={props.onZoomIn} />
      </span>
      <span className={styles.cluster}>
        <Tool icon="search" label="Tìm" pressed={props.findOpen} onClick={props.onFind} />
        <Tool icon={props.fullscreen ? "fullscreen-exit" : "fullscreen"} label={props.fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"} onClick={props.onFullscreen} />
        {props.expandAll && <Tool icon={props.expandAll.open ? "square-minus" : "square-plus"} label={props.expandAll.open ? "Thu gọn tất cả" : "Mở rộng tất cả"} onClick={props.expandAll.onToggle} />}
      </span>
    </div>
  );
}
