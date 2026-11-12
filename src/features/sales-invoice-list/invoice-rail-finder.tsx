"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { InterfaceIcon, type InterfaceIconName } from "@/components/ui/interface-icon";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { customerRepository } from "@/features/customers/repository";
import { useRemote } from "@/features/operations/ui";
import styles from "@/features/purchase-documents/purchases.module.css";
import { lotSearch } from "./invoice-list-contracts";
import type { Picked } from "./invoice-list-logic";
import { invoiceRepository } from "./use-invoice-list";

type Search = (term: string, signal: AbortSignal) => Promise<WorkspaceResult<Picked[]>>;

/** Customers are found by name or phone on the server: the list is too long for a select. The caller needs the right to read customers, else the filter is not offered. */
export const searchCustomers: Search = async (term, signal) => {
  const result = await customerRepository.list({ search: term, pageSize: "8" }, signal);
  return result.status === "success" ? { status: "success", data: result.data.items.map((row) => ({ id: row.id, title: row.name, sub: [row.code, row.phoneNumber].filter(Boolean).join(" · ") })) } : result;
};
/** Harvest lots are found by code (the API wants two characters at least); the invoices with a line of that lot are listed. */
export const searchLots: Search = async (term, signal) => {
  const result = await invoiceRepository.read("lots", { lotCode: term }, lotSearch, signal);
  return result.status === "success" ? { status: "success", data: result.data.lots.slice(0, 8).map((lot) => ({ id: lot.id, title: lot.lotCode, sub: `Vùng ${lot.zoneCode}` })) } : result;
};

type Props = { label: string; placeholder: string; icon: InterfaceIconName; minLength?: number; value: Picked | null; search: Search; onChange(next: Picked | null): void };

/** A search box of the filter rail that finds one record on the server: typed text opens a list under the box, the chosen record shows as a chip that can be cleared. Same boxes as the item and supplier finders of the receipt editor. */
export function RailFinder({ label, placeholder, icon, minLength = 1, value, search, onChange }: Props) {
  const [text, setText] = useState(""), [term, setTerm] = useState(""), [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { const timer = setTimeout(() => setTerm(text.trim()), 300); return () => clearTimeout(timer); }, [text]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const found = useRemote(useCallback((signal: AbortSignal) => term.length >= minLength ? search(term, signal) : Promise.resolve<WorkspaceResult<Picked[] | undefined>>({ status: "success", data: undefined }), [term, minLength, search]));
  const pick = (next: Picked) => { onChange(next); setText(""); setTerm(""); setOpen(false); };

  if (value) return <div className={styles.supplierChosen}><InterfaceIcon name={icon} /><span><strong>{value.title}</strong>{value.sub && <small>{value.sub}</small>}</span>
    <button type="button" aria-label={`Bỏ chọn ${label.toLowerCase()}`} title="Bỏ chọn" onClick={() => onChange(null)}><InterfaceIcon name="close" /></button></div>;
  return <div ref={root} className={styles.finder} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
    <InterfaceIcon name="search" />
    <input type="search" aria-label={label} placeholder={placeholder} maxLength={100} value={text} onFocus={() => setOpen(true)} onChange={(event) => { setText(event.target.value); setOpen(true); }}
      onKeyDown={(event) => { if (event.key === "Enter" && found.data?.[0]) { event.preventDefault(); pick(found.data[0]); } }} />
    {open && term.length >= minLength && <div className={styles.finderList}>
      {found.loading ? <p role="status" className={styles.empty}>Đang tìm…</p> : found.error ? <p role="alert" className={styles.empty}>{found.error}</p>
        : found.data?.length ? found.data.map((row) => <button key={row.id} type="button" onClick={() => pick(row)}><span>{row.title}</span>{row.sub && <small>{row.sub}</small>}</button>)
          : <p className={styles.empty}>Không tìm thấy {label.toLowerCase()}.</p>}
    </div>}
  </div>;
}
