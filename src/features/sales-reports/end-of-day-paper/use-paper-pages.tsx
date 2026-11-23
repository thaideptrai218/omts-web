"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { EndOfDayOrientation } from "../end-of-day-contracts";
import type { EodDocument } from "../end-of-day-model";
import { headerHeights, headerKey, toFlowItems, type FlowEntry } from "./paper-flow";
import { PaperEntries, PaperTableHead } from "./paper-page";
import { pageGeometry, paginate } from "./paginate";
import styles from "./paper.module.css";

const sameHeights = (a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>) => a.size === b.size && [...b].every(([key, height]) => a.get(key) === height);

/**
 * Chia báo cáo thành các trang giấy. Một khối ẩn có đúng bề rộng nội dung của trang vẽ từng phần tử riêng lẻ (và từng dòng tiêu đề bảng) để đo chiều cao thật;
 * `paginate` cắt theo chiều cao đó. Đo lại (useLayoutEffect, trước khi vẽ) mỗi khi phần tử, hướng giấy hoặc phông chữ đổi, nên dữ liệu mới, ⊞/⊟ và đổi dọc/ngang đều chia lại trang.
 * Thu phóng chỉ phóng to khung hiển thị bằng CSS nên không làm đổi cách chia trang.
 */
export function usePaperPages(entries: readonly FlowEntry[], doc: EodDocument, orientation: EndOfDayOrientation) {
  const ref = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<ReadonlyMap<string, number>>(() => new Map());
  const measure = useCallback(() => {
    const root = ref.current;
    if (!root) return;
    const next = new Map<string, number>();
    for (const element of Array.from(root.children) as HTMLElement[]) if (element.dataset.measure) next.set(element.dataset.measure, element.getBoundingClientRect().height);
    setHeights((current) => sameHeights(current, next) ? current : next);
  }, []);
  useLayoutEffect(measure, [measure, entries, doc, orientation]);
  useEffect(() => {
    let alive = true;
    void document.fonts?.ready.then(() => { if (alive) measure(); });
    return () => { alive = false; };
  }, [measure, entries, orientation]);
  const geometry = pageGeometry(orientation);
  const pages = useMemo(() => paginate(toFlowItems(entries, heights), geometry.contentHeight, headerHeights(doc, heights)), [entries, heights, doc, geometry.contentHeight]);
  const measurer = (
    <div ref={ref} className={`${styles.measure} ${styles.content}`} aria-hidden="true" style={{ width: geometry.contentWidth }}>
      {doc.tables.map((table) => <div key={headerKey(table.id)} data-measure={headerKey(table.id)}><PaperTableHead table={table} /></div>)}
      {entries.map((entry) => <div key={entry.key} data-measure={entry.key}><PaperEntries entries={[entry]} withoutHead state={{}} search={{ query: "" }} /></div>)}
    </div>
  );
  return { pages, measurer, geometry };
}
