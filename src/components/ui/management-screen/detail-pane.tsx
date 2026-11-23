"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** The element inside the screen's right-hand detail pane that opened rows render into; null outside a ManagementLayout or inside the pane itself. */
export const DetailPaneTarget = createContext<HTMLElement | null>(null);

/**
 * Where a list screen puts the detail of its open row. Inside a ManagementLayout the detail moves to the pane beside the list
 * (the list narrows to its key columns, the filter rail steps aside); anywhere else it stays as the usual full-width row under
 * the clicked one. The React tree is the same either way, so the detail keeps its state and the screen's own handlers.
 */
export function DetailRow({ colSpan, className, children, ...props }: { colSpan: number; className?: string; children: ReactNode; id?: string }) {
  const target = useContext(DetailPaneTarget);
  useEffect(() => {
    const screen = target?.closest("[data-management-screen]");
    screen?.setAttribute("data-detail-open", "");
    return () => screen?.removeAttribute("data-detail-open");
  }, [target]);
  // Detail rows nested inside the pane (a tab with its own table) stay inline.
  if (target) return createPortal(<DetailPaneTarget.Provider value={null}>{children}</DetailPaneTarget.Provider>, target);
  return <tr {...props}><td colSpan={colSpan} className={className}>{children}</td></tr>;
}

/** Closes the open row the way the screen's own toggle does (so unsaved-change guards still run). */
export function closeOpenRow(pane: HTMLElement) {
  pane.closest("[data-management-screen]")?.querySelector<HTMLElement>("tr button[aria-expanded='true']")?.click();
}
