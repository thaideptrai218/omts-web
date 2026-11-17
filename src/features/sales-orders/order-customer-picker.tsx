"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { CustomerFormDialog } from "@/features/customers/customer-form-dialog";
import { useRemote } from "@/features/operations/ui";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";

export type OrderCustomer = { id: string; code: string; name: string; phone: string };
const customers = createWorkspaceRepository("customers");
const text = (value: unknown) => typeof value === "string" ? value : "";

/**
 * Search-as-you-type customer box. The first option is "Khách lẻ" (a buyer with no profile); "+ Tạo khách hàng mới" is the last one and opens the profile form.
 * A chosen customer shows as a chip that can be cleared unless the order is locked to it.
 */
export function OrderCustomerPicker({ customer, walkIn, locked, canAdd, onPick, onWalkIn }: {
  customer: OrderCustomer | null; walkIn: boolean; locked?: boolean; canAdd?: boolean; onPick(customer: OrderCustomer | null): void; onWalkIn(): void;
}) {
  const [term, setTerm] = useState(""), [query, setQuery] = useState(""), [open, setOpen] = useState(false), [creating, setCreating] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { const timer = setTimeout(() => setQuery(term.trim()), 250); return () => clearTimeout(timer); }, [term]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const pick = (next: OrderCustomer) => { onPick(next); setTerm(""); setOpen(false); };

  if (walkIn || customer) {
    return <div className={purchaseStyles.supplierChosen}><InterfaceIcon name="user" /><span><strong>{walkIn ? "Khách lẻ" : customer?.name}</strong>{!walkIn && <small>{customer?.code} · {customer?.phone || "Chưa có số điện thoại"}</small>}</span>
      {!locked && <button type="button" aria-label="Bỏ chọn khách hàng" title="Bỏ chọn" onClick={() => onPick(null)}><InterfaceIcon name="close" /></button>}</div>;
  }
  return <div ref={root} className={`${purchaseStyles.finder} ${purchaseStyles.supplierFinder}`} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
    <InterfaceIcon name="search" />
    <input type="search" aria-label="Tìm khách hàng" placeholder="Tìm khách hàng theo tên, mã hoặc số điện thoại" value={term} onFocus={() => setOpen(true)} onChange={(event) => { setTerm(event.target.value); setOpen(true); }} />
    {open && <div className={purchaseStyles.finderList}>
      <button type="button" onClick={() => { onWalkIn(); setOpen(false); }}><span>Khách lẻ</span><small>Không có hồ sơ khách hàng</small></button>
      <Results query={query} onPick={pick} />
      {canAdd && <button type="button" onClick={() => { setOpen(false); setCreating(true); }}><span>+ Tạo khách hàng mới</span></button>}
    </div>}
    {creating && <CustomerFormDialog record={null} onClose={() => setCreating(false)} onSaved={(saved) => { setCreating(false); pick({ id: saved.id, code: saved.code, name: saved.name, phone: saved.phoneNumber ?? "" }); }} />}
  </div>;
}

/** The customers that match the search: read only while the list is open. */
function Results({ query, onPick }: { query: string; onPick(customer: OrderCustomer): void }) {
  const found = useRemote(useCallback((signal: AbortSignal) => customers.list({ search: query, pageSize: "8" }, signal), [query]));
  const rows = found.data?.items.filter((row) => row.statusId === undefined || row.statusId === 101) ?? [];
  if (found.loading) return <p className={purchaseStyles.empty}>Đang tìm…</p>;
  if (found.error) return <p className={purchaseStyles.empty} role="alert">{found.error}</p>;
  return <>
    {rows.map((row) => <button key={row.id} type="button" onClick={() => onPick({ id: row.id, code: text(row.code), name: text(row.name), phone: text(row.phoneNumber) })}><span>{text(row.name)}</span><small>{text(row.code)} · {text(row.phoneNumber) || "Chưa có số điện thoại"}</small></button>)}
    {!rows.length && <p className={purchaseStyles.empty}>Không tìm thấy khách hàng.</p>}
  </>;
}
