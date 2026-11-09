"use client";
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { InterfaceIcon, type InterfaceIconName } from "../interface-icon";
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

/**
 * The management screen frame: one viewport on desktop with only the list scrolling. The toolbar and the body share one
 * column template, so the search box lines up with the list and stays put when the filter rail closes.
 */
export function ManagementLayout({ storageKey, icon, title, search, actions, filters, filterLabel = "Bộ lọc", footer, children }: {
  storageKey: string; icon: InterfaceIconName; title: string; search: ReactNode; actions: ReactNode; filters: ReactNode; filterLabel?: string; footer?: ReactNode; children: ReactNode;
}) {
  const [stored, store] = useStoredValue(`omts-filter-rail-${storageKey}`, "open");
  const open = stored !== "closed";
  const root = useRef<HTMLElement>(null);
  useFitManagementViewport(root);
  return <section ref={root} className={`${styles.theme} ${styles.screen}`} data-management-screen data-filters={open ? "open" : "closed"}>
    <header className={styles.toolbar}>
      <div className={styles.title}><InterfaceIcon name={icon} className="size-[18px] shrink-0" /><h1>{title}</h1></div>
      <div className={styles.tools}><div className={styles.search}><InterfaceIcon name="search" />{search}</div><div className={styles.actions}>{actions}</div></div>
    </header>
    <div className={styles.body}>
      {open && <aside className={styles.rail} aria-label={filterLabel}>
        <div className={styles.railScroll}>{filters}</div>
        <button type="button" className={`${styles.railToggle} ${styles.railClose}`} aria-label="Ẩn bộ lọc" title="Ẩn bộ lọc" onClick={() => store("closed")}><InterfaceIcon name="chevron-left" /></button>
      </aside>}
      <div className={styles.listColumn}>
        <div className={styles.list}>
          {!open && <button type="button" className={`${styles.railToggle} ${styles.railOpen}`} aria-label="Hiện bộ lọc" title="Hiện bộ lọc" onClick={() => store("open")}><InterfaceIcon name="chevron-right" /></button>}
          {children}
        </div>
        {footer}
      </div>
    </div>
  </section>;
}

export function ToolbarIconButton({ icon, label, disabled, onClick }: { icon: InterfaceIconName; label: string; disabled?: boolean; onClick?(): void }) {
  return <button type="button" className={styles.iconButton} aria-label={label} title={label} disabled={disabled} onClick={onClick}><InterfaceIcon name={icon} /></button>;
}

/** Help opens the guide when one exists; without a link it stays visible and disabled. */
export function HelpLink({ helpHref }: { helpHref?: string }) {
  return helpHref
    ? <a className={styles.iconButton} href={helpHref} aria-label="Hướng dẫn" title="Hướng dẫn"><InterfaceIcon name="help" /></a>
    : <ToolbarIconButton icon="help" label="Hướng dẫn (chưa có)" disabled />;
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
