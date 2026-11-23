"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useToast } from "@/components/ui/toast-provider";
import type { EndOfDayOrientation } from "../end-of-day-contracts";
import { allOpen, type EodDocument, type OpenState } from "../end-of-day-model";
import type { ExportFormat } from "../export-menu";
import { buildFlow, type PaperHead } from "./paper-flow";
import { PaperEntries, PaperSheet, type SearchState } from "./paper-page";
import { PaperPrintRoot } from "./paper-print";
import { findMatches, stepMatch } from "./paper-search";
import { PaperToolbar } from "./paper-toolbar";
import { clampPage, MARGIN_MM } from "./paginate";
import styles from "./paper.module.css";
import { usePaperPages } from "./use-paper-pages";

const ZOOMS = [50, 67, 75, 90, 100, 110, 125, 150, 175, 200] as const;
const DEFAULT_ZOOM = 4;
/** Tờ in thấp hơn khổ giấy một chút để làm tròn của máy in không đẩy thêm một trang trắng. */
const PRINT_TRIM_MM = 0.4;

type Props = Readonly<{
  doc: EodDocument; head: PaperHead; orientation: EndOfDayOrientation; state: OpenState; onToggle(key: string): void; onToggleAll(open: boolean): void;
  history: Readonly<{ canBack: boolean; canForward: boolean; back(): void; forward(): void }>;
  onRefresh(): void; canDownload: boolean; downloading?: boolean; onDownload(format: ExportFormat): void;
}>;

/**
 * Trang báo cáo kiểu giấy: thanh công cụ, khung xem xám và các trang A4 trắng (cuộn liên tục, hoặc từng trang khi bật "Xem trước khi in").
 * Dòng có ⊞/⊟ mở/đóng ngay trong trang và trang được chia lại. In dùng bản sao các trang gắn vào body (PaperPrintRoot); Tìm tô sáng và nhảy tới trang chứa kết quả.
 */
export function PaperViewer({ doc, head, orientation, state, onToggle, onToggleAll, history, onRefresh, canDownload, downloading, onDownload }: Props) {
  const { notify } = useToast();
  const entries = useMemo(() => buildFlow(doc, state, head), [doc, state, head]);
  const { pages, measurer, geometry } = usePaperPages(entries, doc, orientation);
  const [page, setPage] = useState(1), [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM), [preview, setPreview] = useState(false), [fullscreen, setFullscreen] = useState(false);
  const [find, setFind] = useState({ open: false, query: "", index: 0 });
  const viewer = useRef<HTMLDivElement>(null), scroller = useRef<HTMLDivElement>(null), sheets = useRef(new Map<number, HTMLElement>());
  const current = clampPage(page, pages.length), zoom = ZOOMS[zoomIndex];
  const byKey = useMemo(() => new Map(entries.map((entry) => [entry.key, entry])), [entries]);
  const matches = useMemo(() => find.open ? findMatches(entries, pages, find.query) : [], [find.open, find.query, entries, pages]);
  const active = matches[Math.min(find.index, Math.max(0, matches.length - 1))];
  const search: SearchState = { query: find.open ? find.query : "", active };
  const activeId = active ? `${active.key}:${active.cell}:${active.nth}` : "";

  const goTo = useCallback((target: number) => {
    const next = clampPage(target, pages.length);
    setPage(next);
    const box = scroller.current, sheet = sheets.current.get(next);
    if (box && sheet) box.scrollTop += sheet.getBoundingClientRect().top - box.getBoundingClientRect().top - 12;
  }, [pages.length]);

  // Cuộn liên tục: trang đang xem là trang có mép trên đã qua 35% chiều cao khung.
  const frame = useRef(0);
  const onScroll = () => {
    if (preview || frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const box = scroller.current;
      if (!box) return;
      const line = box.getBoundingClientRect().top + box.clientHeight * 0.35;
      let at = 1;
      sheets.current.forEach((sheet, number) => { if (sheet.getBoundingClientRect().top <= line && number > at) at = number; });
      setPage(at);
    });
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  // Vừa khung: khi mở hoặc đổi dọc/ngang, chọn mức zoom lớn nhất (tối đa 100%) để cả bề ngang trang nằm gọn trong khung xem.
  useEffect(() => {
    const room = (scroller.current?.clientWidth ?? 0) - 32;
    if (room <= 0) return;
    const fit = ZOOMS.findLastIndex((value, index) => index <= DEFAULT_ZOOM && (value / 100) * geometry.width <= room);
    setZoomIndex(fit < 0 ? 0 : fit);
  }, [geometry.width]);
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === viewer.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  // Đưa kết quả tìm đang chọn vào giữa khung xem (khi xem từng trang thì đợi trang đó hiện ra).
  const revealKey = preview ? `${activeId}@${current}` : activeId;
  useEffect(() => {
    const box = scroller.current, mark = box?.querySelector<HTMLElement>("mark[data-active]");
    if (!box || !mark) return;
    const area = box.getBoundingClientRect(), spot = mark.getBoundingClientRect();
    if (spot.top < area.top + 8 || spot.bottom > area.bottom - 8) box.scrollTop += spot.top - area.top - area.height / 2;
  }, [revealKey]);

  const toggleFullscreen = () => {
    const request = document.fullscreenElement ? document.exitFullscreen() : viewer.current?.requestFullscreen();
    request?.catch(() => notify({ tone: "warning", title: "Trình duyệt không cho bật toàn màn hình." }));
  };
  const jumpToMatch = (index: number) => { setFind((value) => ({ ...value, index })); const target = matches[index]; if (target) goTo(target.page); };
  const setQuery = (query: string) => {
    setFind((value) => ({ ...value, query, index: 0 }));
    const first = findMatches(entries, pages, query)[0];
    if (first) goTo(first.page);
  };
  const shown = preview ? pages.slice(current - 1, current) : pages;
  const entriesOf = (plan: (typeof pages)[number]) => plan.keys.flatMap((key) => byKey.get(key) ?? []);

  return (
    <div ref={viewer} className={styles.viewer}>
      <PaperToolbar page={current} pageCount={pages.length} onPage={goTo} canBack={history.canBack} canForward={history.canForward} onBack={history.back} onForward={history.forward} onRefresh={onRefresh}
        preview={preview} onPreview={() => { setPreview((value) => !value); requestAnimationFrame(() => scroller.current?.scrollTo({ top: 0 })); }}
        canDownload={canDownload} downloading={downloading} onDownload={onDownload} onPrint={() => window.print()}
        zoom={zoom} canZoomIn={zoomIndex < ZOOMS.length - 1} canZoomOut={zoomIndex > 0} onZoomIn={() => setZoomIndex((value) => Math.min(ZOOMS.length - 1, value + 1))} onZoomOut={() => setZoomIndex((value) => Math.max(0, value - 1))}
        findOpen={find.open} onFind={() => setFind((value) => ({ ...value, open: !value.open }))} fullscreen={fullscreen} onFullscreen={toggleFullscreen}
        expandAll={doc.tables.some((table) => table.rows.some((row) => row.toggle)) ? { open: allOpen(doc, state), onToggle: () => onToggleAll(!allOpen(doc, state)) } : undefined} />
      {find.open && (
        <div className={styles.findBar} role="search">
          <InterfaceIcon name="search" className="size-4" />
          <input className={styles.findInput} type="search" autoFocus aria-label="Tìm trong báo cáo" placeholder="Tìm trong báo cáo" maxLength={100} value={find.query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); jumpToMatch(stepMatch(find.index, event.shiftKey ? -1 : 1, matches.length)); }
              else if (event.key === "Escape") setFind((value) => ({ ...value, open: false }));
            }} />
          <span className={styles.findCount} aria-live="polite">{find.query.trim() ? (matches.length ? `${Math.min(find.index, matches.length - 1) + 1}/${matches.length}` : "Không thấy") : ""}</span>
          <button type="button" className={styles.tool} aria-label="Kết quả trước" title="Kết quả trước" disabled={!matches.length} onClick={() => jumpToMatch(stepMatch(find.index, -1, matches.length))}><InterfaceIcon name="chevron-up" /></button>
          <button type="button" className={styles.tool} aria-label="Kết quả sau" title="Kết quả sau" disabled={!matches.length} onClick={() => jumpToMatch(stepMatch(find.index, 1, matches.length))}><InterfaceIcon name="chevron-down" /></button>
        </div>
      )}
      <div ref={scroller} className={styles.scroller} tabIndex={0} role="document" aria-label="Các trang báo cáo" onScroll={onScroll}>
        <div className={styles.stack} style={{ zoom: String(zoom / 100) }}>
          {shown.map((plan, index) => {
            const number = preview ? current : index + 1;
            return (
              <div key={number} ref={(element) => { if (element) sheets.current.set(number, element); else sheets.current.delete(number); }}>
                <PaperSheet number={number} total={pages.length} widthMm={geometry.widthMm} heightMm={geometry.heightMm} margin={MARGIN_MM} className={styles.page}>
                  <PaperEntries entries={entriesOf(plan)} state={state} search={search} onToggle={onToggle} />
                </PaperSheet>
              </div>
            );
          })}
        </div>
      </div>
      {measurer}
      <PaperPrintRoot orientation={orientation}>
        {pages.map((plan, index) => (
          <PaperSheet key={index} number={index + 1} total={pages.length} widthMm={geometry.widthMm} heightMm={geometry.heightMm - PRINT_TRIM_MM} margin={MARGIN_MM} className={styles.printPage}>
            <PaperEntries entries={entriesOf(plan)} state={state} search={{ query: "" }} />
          </PaperSheet>
        ))}
      </PaperPrintRoot>
    </div>
  );
}
