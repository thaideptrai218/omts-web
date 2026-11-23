"use client";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { InterfaceIcon, type InterfaceIconName } from "../interface-icon";
import { closeOpenRow, DetailPaneTarget } from "./detail-pane";
import { useStoredValue } from "./use-stored-value";
import styles from "./management-screen.module.css";

/** Publishes how far the element starts from the viewport top, so its height can end exactly at the page bottom. */
export function useFitManagementViewport(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const fit = () => {
      const main = element.closest("main");
      const bottom = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
      element.style.setProperty("--management-top", `${element.getBoundingClientRect().top + window.scrollY + bottom}px`);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [root]);
}

/** True while the viewport is at most `maxWidth` px wide (the filter rail becomes a drawer there); false where matchMedia does not exist. */
function useNarrowScreen(maxWidth = 900) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(`(max-width:${maxWidth}px)`), sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [maxWidth]);
  return narrow;
}

/**
 * The management screen frame: one viewport on desktop with only the list scrolling. The toolbar and the body share one
 * column template, so the search box lines up with the list and stays put when the filter rail closes.
 */
export function ManagementLayout({ storageKey, icon, title, search, actions, filters, filterLabel = "Bộ lọc", footer, children }: {
  storageKey: string; icon: InterfaceIconName; title: string; search?: ReactNode; actions: ReactNode; filters: ReactNode; filterLabel?: string; footer?: ReactNode; children: ReactNode;
}) {
  const [stored, store] = useStoredValue(`omts-filter-rail-${storageKey}`, "open");
  const narrow = useNarrowScreen();
  // On a narrow screen the rail is a drawer that starts closed and is never remembered: the list is what the user came for.
  const [drawer, setDrawer] = useState(false);
  const open = narrow ? drawer : stored !== "closed";
  const setOpen = (next: boolean) => narrow ? setDrawer(next) : store(next ? "open" : "closed");
  const root = useRef<HTMLElement>(null);
  // The right-hand pane an open row's detail renders into (see DetailRow); hidden by CSS while no row is open.
  const [pane, setPane] = useState<HTMLElement | null>(null);
  useFitManagementViewport(root);
  return <section ref={root} className={`${styles.theme} ${styles.screen}`} data-management-screen data-filters={open ? "open" : "closed"}>
    <header className={styles.toolbar}>
      <div className={styles.title}><InterfaceIcon name={icon} className="size-[18px] shrink-0" /><h1>{title}</h1></div>
      <div className={styles.tools}>{/* Không có ô tìm kiếm (màn không có gì để tìm): giữ một khoảng trống cùng cột để các nút bên phải không nhảy chỗ. */}
      {search ? <div className={styles.search}><InterfaceIcon name="search" />{search}</div> : <div aria-hidden="true" />}<div className={styles.actions}>{actions}</div></div>
    </header>
    <div className={styles.body}>
      {open && narrow && <button type="button" className={styles.drawerBackdrop} aria-label="Đóng bộ lọc" tabIndex={-1} onClick={() => setOpen(false)} />}
      {open && <aside className={styles.rail} aria-label={filterLabel}>
        {narrow && <div className={styles.drawerHead}><strong>{filterLabel}</strong><button type="button" className={styles.drawerClose} onClick={() => setOpen(false)}>Đóng</button></div>}
        <div className={styles.railScroll}>{filters}</div>
        {!narrow && <button type="button" className={`${styles.railToggle} ${styles.railClose}`} aria-label="Ẩn bộ lọc" title="Ẩn bộ lọc" onClick={() => setOpen(false)}><InterfaceIcon name="chevron-left" /></button>}
      </aside>}
      <div className={styles.listColumn}>
        {/* Outside the list box, which clips its content, so the button can straddle the list's left border. */}
        {!open && <button type="button" className={`${styles.railToggle} ${styles.railOpen}`} aria-label="Hiện bộ lọc" title="Hiện bộ lọc" onClick={() => setOpen(true)}>{narrow ? <><InterfaceIcon name="panel-open" /> Bộ lọc</> : <InterfaceIcon name="chevron-right" />}</button>}
        <div className={styles.list}>
          <DetailPaneTarget.Provider value={pane}>{children}</DetailPaneTarget.Provider>
        </div>
        {footer}
      </div>
      <aside className={styles.detailPane} aria-label="Chi tiết" onKeyDown={event => {
        // Esc closes the detail, but only a key pressed inside it (a dialog opened from it handles its own Esc).
        if (event.key === "Escape" && !event.defaultPrevented && event.target instanceof Node && event.currentTarget.contains(event.target)) closeOpenRow(event.currentTarget);
      }}>
        <button type="button" className={styles.detailClose} aria-label="Đóng chi tiết" title="Đóng chi tiết (Esc)" onClick={event => closeOpenRow(event.currentTarget.parentElement!)}><InterfaceIcon name="close" /></button>
        <div className={styles.detailPaneBody} ref={setPane} />
      </aside>
    </div>
  </section>;
}

export function ToolbarIconButton({ icon, label, disabled, onClick }: { icon: InterfaceIconName; label: string; disabled?: boolean; onClick?(): void }) {
  return <button type="button" className={styles.iconButton} aria-label={label} title={label} disabled={disabled} onClick={onClick}><InterfaceIcon name={icon} /></button>;
}

/** Help opens the guide when one exists; without a guide nothing is rendered rather than a dead, disabled button. */
export function HelpLink({ helpHref }: { helpHref?: string }) {
  return helpHref ? <a className={styles.iconButton} href={helpHref} aria-label="Hướng dẫn" title="Hướng dẫn"><InterfaceIcon name="help" /></a> : null;
}

export function FilterGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return <fieldset className={styles.filterGroup}><legend>{legend}</legend>{children}</fieldset>;
}

/** For a short, fixed set of options; a list that may grow belongs in a select. */
export function FilterPills({ legend, name, value, options, onChange }: {
  legend: string; name: string; value: string; options: readonly (readonly [string, string])[]; onChange(value: string): void;
}) {
  return <FilterGroup legend={legend}><div className={styles.pills}>{[["", "Tất cả"] as const, ...options].map(([key, label]) =>
    <label key={key} className={styles.pill}><input type="radio" className="sr-only" name={name} checked={value === key} onChange={() => onChange(key)} />{label}</label>)}</div></FilterGroup>;
}
