"use client";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { InterfaceIcon, type InterfaceIconName } from "../interface-icon";
import { closeOpenRow, DetailPaneTarget } from "./detail-pane";
import { SettingsFilterSlotContext } from "./settings-filter-slot-context";
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

/** Set while the filters stand in the settings sidebar column, so their header can offer "Đóng". */
const CloseFilterPanel = createContext<(() => void) | null>(null);

/**
 * Where an open row's detail goes; the screen's value is the default and the user can switch it from the toolbar. "inline" (default): a full-width row right under the clicked one, the list keeps all its
 * columns. "split": a pane beside the list, which narrows to its key columns (full screen on a
 * narrow viewport).
 */
export type DetailLayout = "split" | "inline";

/**
 * The management screen frame: one viewport on desktop with only the list scrolling. The toolbar and the body share one
 * column template, so the search box lines up with the list and stays put when the filter rail closes.
 * Inside the Cài đặt frame there is no rail: a "Lọc" button shows the filters in place of the settings list (a drawer on phones).
 */
export function ManagementLayout({ storageKey, icon, title, search, actions, filters, filtersActive, filterLabel = "Bộ lọc", footer, detailLayout = "inline", children }: {
  storageKey: string; icon: InterfaceIconName; title: string; search?: ReactNode; actions: ReactNode; filters?: ReactNode; /** Marks the "Lọc" button (settings pages) while a filter narrows the list. */ filtersActive?: boolean; filterLabel?: string; footer?: ReactNode;
  detailLayout?: DetailLayout; children: ReactNode;
}) {
  const [stored, store] = useStoredValue(`omts-filter-rail-${storageKey}`, "open");
  const narrow = useNarrowScreen();
  const settings = useContext(SettingsFilterSlotContext);
  const framed = settings !== null;
  // On a narrow screen (a drawer) and in the settings frame the filters start closed and are never remembered: the list is what the user came for.
  const [shown, setShown] = useState(false);
  const transient = narrow || framed;
  // A screen without `filters` has no rail, no rail toggle and no "Lọc" button: the list takes the full width.
  const hasRail = filters !== undefined;
  const open = hasRail && (transient ? shown : stored !== "closed");
  const setOpen = (next: boolean) => transient ? setShown(next) : store(next ? "open" : "closed");
  const toggle = useRef<HTMLButtonElement>(null), panel = useRef<HTMLElement>(null);
  const column = framed && !narrow ? settings.column : null;
  const inSidebar = open && column !== null;
  const setFiltering = settings?.setFiltering;
  useLayoutEffect(() => {
    if (!inSidebar || !setFiltering) return;
    setFiltering(true);
    return () => setFiltering(false);
  }, [inSidebar, setFiltering]);
  // A page kept alive but hidden after navigating away must come back with its filters closed.
  useEffect(() => framed ? () => setShown(false) : undefined, [framed]);
  useEffect(() => { if (framed && open) panel.current?.focus({ preventScroll: true }); }, [framed, open, inSidebar]);
  const close = () => { setOpen(false); if (framed) toggle.current?.focus(); };
  const closeOnEscape = (event: KeyboardEvent<HTMLElement>) => {
    const here = event.currentTarget;
    // Keys from a popup portalled elsewhere, or while a select list is open, belong to that popup.
    if (!framed || !open || event.key !== "Escape" || event.defaultPrevented || !(event.target instanceof Node) || !here.contains(event.target) || here.querySelector(".omts-select-trigger[data-open]")) return;
    event.preventDefault();
    close();
  };
  const root = useRef<HTMLElement>(null);
  // The right-hand pane an open row's detail renders into (see DetailRow); hidden by CSS while no row is open.
  const [pane, setPane] = useState<HTMLElement | null>(null);
  useFitManagementViewport(root);
  // The screen's detailLayout is only the starting choice: the user flips it with the toolbar button, remembered per screen in this browser.
  const [storedLayout, storeLayout] = useStoredValue(`omts-detail-layout-${storageKey}`, detailLayout);
  const split = storedLayout === "split";
  return <section ref={root} className={`${styles.theme} ${styles.screen}`} data-management-screen data-detail-layout={detailLayout} data-filters={open ? "open" : "closed"} data-settings-framed={framed || undefined}>
    <header className={styles.toolbar}>
      <div className={styles.title}><InterfaceIcon name={icon} className="size-[18px] shrink-0" /><h1>{title}</h1></div>
      <div className={styles.tools}>{framed && hasRail && <button ref={toggle} type="button" className={styles.filterToggle} data-filter-toggle aria-expanded={open} onKeyDown={closeOnEscape} onClick={() => open ? close() : setOpen(true)}>
        <InterfaceIcon name="filter" />Lọc{filtersActive && <><span className={styles.filterDot} aria-hidden="true" /><span className="sr-only"> (đang lọc)</span></>}
      </button>}{/* Không có ô tìm kiếm (màn không có gì để tìm): giữ một khoảng trống cùng cột để các nút bên phải không nhảy chỗ. */}
      {search ? <div className={styles.search}><InterfaceIcon name="search" />{search}</div> : <div aria-hidden="true" />}<div className={styles.actions}>{actions}
        {!narrow && <button type="button" className={styles.iconButton} aria-pressed={split} aria-label="Chia đôi màn hình khi mở chi tiết"
          title={split ? "Chi tiết đang chia đôi màn hình. Bấm để xổ xuống dưới dòng" : "Chi tiết đang xổ xuống dưới dòng. Bấm để chia đôi màn hình"}
          onClick={() => storeLayout(split ? "inline" : "split")}><InterfaceIcon name={split ? "layout-split" : "layout-rows"} /></button>}</div></div>
    </header>
    <div className={styles.body}>
      {open && narrow && <button type="button" className={styles.drawerBackdrop} aria-label="Đóng bộ lọc" tabIndex={-1} onClick={close} />}
      {open && !column && <aside ref={panel} tabIndex={framed ? -1 : undefined} className={styles.rail} aria-label={filterLabel} onKeyDown={closeOnEscape}>
        {narrow && <div className={styles.drawerHead}><strong>{filterLabel}</strong><button type="button" className={styles.drawerClose} onClick={close}>Đóng</button></div>}
        <div className={styles.railScroll}>{filters}</div>
        {!narrow && !framed && <button type="button" className={`${styles.railToggle} ${styles.railClose}`} aria-label="Ẩn bộ lọc" title="Ẩn bộ lọc" onClick={close}><InterfaceIcon name="chevron-left" /></button>}
      </aside>}
      {open && column && createPortal(<aside ref={panel} tabIndex={-1} className={`${styles.theme} ${styles.rail} ${styles.sidebarRail}`} aria-label={filterLabel} onKeyDown={closeOnEscape}>
        <div className={styles.railScroll}><CloseFilterPanel.Provider value={close}>{filters}</CloseFilterPanel.Provider></div>
      </aside>, column)}
      <div className={styles.listColumn}>
        {/* Outside the list box, which clips its content, so the button can straddle the list's left border. */}
        {hasRail && !open && !framed && <button type="button" className={`${styles.railToggle} ${styles.railOpen}`} aria-label="Hiện bộ lọc" title="Hiện bộ lọc" onClick={() => setOpen(true)}>{narrow ? <><InterfaceIcon name="panel-open" /> Bộ lọc</> : <InterfaceIcon name="chevron-right" />}</button>}
        <div className={styles.list}>
          {/* Inline: no pane target, so every DetailRow renders as the row under the clicked one. */}
          <DetailPaneTarget.Provider value={split ? pane : null}>{children}</DetailPaneTarget.Provider>
        </div>
        {footer}
      </div>
      {split && <aside className={styles.detailPane} aria-label="Chi tiết" onKeyDown={event => {
        // Esc closes the detail, but only a key pressed inside it (a dialog opened from it handles its own Esc).
        if (event.key === "Escape" && !event.defaultPrevented && event.target instanceof Node && event.currentTarget.contains(event.target)) closeOpenRow(event.currentTarget);
      }}>
        <button type="button" className={styles.detailClose} aria-label="Đóng chi tiết" title="Đóng chi tiết (Esc)" onClick={event => closeOpenRow(event.currentTarget.parentElement!)}><InterfaceIcon name="close" /></button>
        <div className={styles.detailPaneBody} ref={setPane} />
      </aside>}
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

/** The first row of a filter rail: its name and "Đặt lại"; in the settings sidebar also "Đóng". */
export function FilterHead({ canReset, onReset }: { canReset: boolean; onReset(): void }) {
  const close = useContext(CloseFilterPanel);
  return <div className={styles.filterHead}><strong>Bộ lọc</strong><div>
    <button type="button" className={styles.linkButton} disabled={!canReset} onClick={onReset}>Đặt lại</button>
    {close && <button type="button" className={styles.linkButton} aria-label="Đóng bộ lọc" onClick={close}>Đóng</button>}
  </div></div>;
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
