"use client";
import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { EndOfDayOrientation } from "../end-of-day-contracts";
import styles from "./paper.module.css";

/** Cho trình duyệt biết khổ giấy và ẩn mọi thứ ngoài khối in: chỉ các trang giấy được in, mỗi trang đúng một tờ, không lề ngoài. */
const printCss = (orientation: EndOfDayOrientation) => `
@page { size: A4 ${orientation}; margin: 0; }
@media print {
  html, body { margin: 0 !important; padding: 0 !important; width: auto !important; min-width: 0 !important; height: auto !important; overflow: visible !important; background: #fff !important; display: block !important; }
  body > *:not([data-eod-print-root]) { display: none !important; }
}`;

const subscribeNothing = () => () => {};

/**
 * Các trang giấy dùng để in, gắn thẳng vào `body` (ngoài mọi khung cuộn, khung lọc và thanh menu) và chỉ hiện khi in. Nhờ vậy bản in không phụ thuộc bố cục
 * màn hình: không bị đẩy lệch phải, không có trang trắng thừa. Hướng giấy lấy từ `orientation` (cùng hướng với trang đang xem).
 */
export function PaperPrintRoot({ orientation, children }: Readonly<{ orientation: EndOfDayOrientation; children: ReactNode }>) {
  const host = useSyncExternalStore(subscribeNothing, () => document.body, () => null);
  if (!host) return null;
  return createPortal(<div className={styles.printRoot} data-eod-print-root><style>{printCss(orientation)}</style>{children}</div>, host);
}
