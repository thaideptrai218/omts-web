"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { InterfaceIcon } from "../interface-icon";
import styles from "./management-screen.module.css";

export type SortState = { key: string; direction: "asc" | "desc" };

/**
 * The one scroller of a management list, for both axes. It publishes its visible width so content that must not stretch
 * with the columns (the open row) can stay as wide as the view with `managementStyles.viewWidth`.
 * Measured rather than a container query: size containment would trap the fixed dialogs opened from inside the list.
 */
export function ManagementScroller({ busy, children }: { busy?: boolean; children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const measure = () => element.style.setProperty("--view-width", `${element.clientWidth}px`);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={scroller} className={styles.scroller} aria-busy={busy}>{children}</div>;
}

export function SortableHeader({ label, sortKey, sort, onSort, className }: { label: string; sortKey?: string; sort: SortState; onSort(next: SortState): void; className?: string }) {
  if (!sortKey) return <th scope="col" className={className}>{label}</th>;
  const active = sort.key === sortKey;
  const toggle = () => onSort({ key: sortKey, direction: active && sort.direction === "asc" ? "desc" : "asc" });
  return <th scope="col" className={className} aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
    <button type="button" className={styles.sortButton} data-active={active || undefined} onClick={toggle}>{label}
      <InterfaceIcon name={active ? (sort.direction === "asc" ? "chevron-up" : "chevron-down") : "sort"} />
    </button>
  </th>;
}

export function ColumnPicker({ columns, visible, onChange }: { columns: readonly { key: string; label: string }[]; visible: readonly string[]; onChange(keys: string[]): void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null), panel = useId();
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return <div ref={root} className={styles.picker} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
    <button type="button" className={styles.iconButton} aria-label="Chọn trường hiển thị" title="Chọn trường hiển thị" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((value) => !value)}><InterfaceIcon name="columns" /></button>
    {open && <div id={panel} className={styles.pickerPanel}>{columns.map((column) =>
      <label key={column.key}><input type="checkbox" checked={visible.includes(column.key)} disabled={visible.length === 1 && visible.includes(column.key)}
        onChange={(event) => onChange(event.target.checked ? [...visible, column.key] : visible.filter((key) => key !== column.key))} />{column.label}</label>)}</div>}
  </div>;
}

export function BulkBar({ count, onClear, children }: { count: number; onClear(): void; children: ReactNode }) {
  if (!count) return null;
  return <div className={styles.bulkBar} role="region" aria-label="Thao tác hàng loạt"><strong>Đã chọn {count}</strong>{children}<button type="button" className={styles.linkButton} onClick={onClear}>Bỏ chọn</button></div>;
}

export function ManagementPagination({ page, pageSize, total, pageSizes = [15, 30, 50], unit, disabled, onPage, onPageSize }: {
  page: number; pageSize: number; total: number; pageSizes?: readonly number[]; unit: string; disabled?: boolean; onPage(page: number): void; onPageSize(size: number): void;
}) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  const [draft, setDraft] = useState<string>();
  const commit = () => {
    if (draft === undefined) return;
    const next = Math.min(last, Math.max(1, Number(draft) || page));
    setDraft(undefined);
    if (next !== page) onPage(next);
  };
  const nav = (label: string, icon: "first" | "chevron-left" | "chevron-right" | "last", target: number, off: boolean) =>
    <button type="button" className={styles.pageButton} aria-label={label} title={label} disabled={disabled || off} onClick={() => onPage(target)}><InterfaceIcon name={icon} /></button>;
  return <nav className={styles.pagination} aria-label="Phân trang">
    <label>Hiển thị<select value={pageSize} disabled={disabled} onChange={(event) => onPageSize(Number(event.target.value))}>{pageSizes.map((size) => <option key={size} value={size}>{size} dòng</option>)}</select></label>
    {nav("Trang đầu", "first", 1, page <= 1)}{nav("Trang trước", "chevron-left", page - 1, page <= 1)}
    <input aria-label="Số trang" inputMode="numeric" value={draft ?? page} disabled={disabled} onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") commit(); }} />
    {nav("Trang sau", "chevron-right", page + 1, page >= last)}{nav("Trang cuối", "last", last, page >= last)}
    <span>{total === 0 ? "0" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}`} trong {total} {unit}</span>
  </nav>;
}

export function Subtabs<T extends string>({ label, tabs, value, onChange, idPrefix, errors = [] }: { label: string; tabs: readonly { key: T; label: string }[]; value: T; onChange(key: T): void; idPrefix?: string; errors?: readonly T[] }) {
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.key === value);
    const next = event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : undefined;
    if (next === undefined) return;
    event.preventDefault();
    const target = tabs[(next + tabs.length) % tabs.length];
    onChange(target.key);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${target.key}"]`)?.focus();
  };
  return <div role="tablist" aria-label={label} className={styles.subtabs} onKeyDown={move}>{tabs.map((tab) =>
    <button key={tab.key} type="button" role="tab" id={idPrefix ? `${idPrefix}-tab-${tab.key}` : undefined} aria-controls={idPrefix ? `${idPrefix}-panel-${tab.key}` : undefined} data-tab={tab.key} aria-selected={tab.key === value} tabIndex={tab.key === value ? 0 : -1} onClick={() => onChange(tab.key)}>{tab.label}{errors.includes(tab.key) && <span> · Có lỗi</span>}</button>)}</div>;
}

export function CollapsibleSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  return <details className={styles.section} open={defaultOpen}><summary>{title}<InterfaceIcon name="chevron-down" /></summary><div className={styles.sectionBody}>{children}</div></details>;
}

export function ListStateMessage({ error, onRetry, retryLabel = "Thử lại", children }: { error?: string; onRetry?(): void; retryLabel?: string; children?: ReactNode }) {
  return <div className={styles.listState} role={error ? "alert" : undefined}><p>{error ?? children}</p>{error && onRetry && <button type="button" className={styles.linkButton} onClick={onRetry}>{retryLabel}</button>}</div>;
}

export { styles as managementStyles };
