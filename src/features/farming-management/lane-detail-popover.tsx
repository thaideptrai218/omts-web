"use client";
import { useEffect, useId, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./lane-overview.module.css";

/** The host remains inside a modal dialog; the native popover escapes clipping and transforms. */
export function LaneDetailPopover({ anchor, number, stateLabel, colorToken, onClose, children }: {
  anchor: HTMLElement; number: number; stateLabel?: string; colorToken?: string; onClose(): void | boolean | Promise<boolean>; children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null), titleId = useId();
  useLayoutEffect(() => {
    const element = panel.current;
    if (!element) return;
    try { if (!element.matches(":popover-open")) element.showPopover(); } catch { /* Fixed fallback for older browsers. */ }
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const height = element.offsetHeight, width = element.offsetWidth;
      const top = window.innerHeight - rect.bottom > Math.min(height, 240) ? rect.bottom + 6 : Math.max(8, rect.top - height - 6);
      element.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
      element.style.top = `${Math.max(8, Math.min(top, window.innerHeight - height - 8))}px`;
    };
    place();
    const observer = new ResizeObserver(place); observer.observe(element);
    window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
    element.focus({ preventScroll: true });
    return () => { observer.disconnect(); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [anchor]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      const target = event.target as Element;
      // Nested selects, calendars and confirmation dialogs have their own top-layer surface.
      if (panel.current?.contains(target) || anchor.contains(target) || target.closest("[data-lane-overview]")) return;
      const surface = target.closest("[popover], dialog");
      if (surface && surface !== anchor.closest("dialog")) return;
      void onClose();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || (event.target as Element).closest("dialog") !== panel.current?.closest("dialog")) return;
      event.preventDefault(); event.stopPropagation();
      void Promise.resolve(onClose()).then(closed => { if (closed !== false) anchor.focus({ preventScroll: true }); });
    };
    document.addEventListener("pointerdown", outside); panel.current?.addEventListener("keydown", escape);
    const element = panel.current;
    return () => { document.removeEventListener("pointerdown", outside); element?.removeEventListener("keydown", escape); };
  }, [anchor, onClose]);
  return createPortal(<div ref={panel} popover="manual" role="dialog" aria-modal="false" aria-labelledby={titleId} tabIndex={-1} className={styles.popover} onSubmit={event => event.stopPropagation()}>
    <div className={styles.popoverHeading} style={colorToken ? { "--lane-color": `var(${colorToken})` } as CSSProperties : undefined}>
      <strong id={titleId} className={styles.popoverTitle}>Làn <span className={styles.popoverBadge}>{number}</span></strong>
      {stateLabel && <span className={styles.statePill}>{stateLabel}</span>}<button key="close-lane" type="button" className={styles.selectButton} aria-label={`Đóng chi tiết làn ${number}`} onClick={async () => { if (await onClose() !== false) anchor.focus({ preventScroll: true }); }}>Đóng</button></div>
    {children}
  </div>, anchor.closest("dialog") ?? document.body);
}
