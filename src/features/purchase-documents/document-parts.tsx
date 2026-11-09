"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useFitManagementViewport } from "@/components/ui/management-screen/management-layout";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { workspaceError } from "@/features/api-workspace/workspace-error";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { ErrorNotice } from "@/features/operations/ui";
import { supplierRepository } from "@/features/suppliers-api/repository";
import type { ItemOption, PaymentMethod, SupplierOption } from "./types";
import styles from "./purchases.module.css";

export const fmt = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(value);
export const viDate = (value: string) => value.slice(0, 10).split("-").reverse().join("/");
/** dd/mm/yyyy HH:mm in the cooperative's time zone: date first, then time. */
export const viDateTime = (value: string) => { const d = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value)), part = (type: string) => d.find((x) => x.type === type)?.value ?? ""; return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}`; };
export const methodLabel: Record<PaymentMethod, string> = { Cash: "Tiền mặt", BankTransfer: "Chuyển khoản", Other: "Khác" };
export const digits = (value: string) => Number(value.replace(/\D/g, "")) || 0;
export const errorText = (result: WorkspaceResult<unknown>) => result.status === "success" ? undefined : workspaceError(result);

export function usePurchaseAccess() {
  const { identity, permissions } = useApiWorkspace();
  const owner = identity.subjectType === "CooperativeOwner";
  const can = (fn: string, action: string) => owner || permissions.functionPermissions.some((p) => p.functionCode === fn && p.action === action);
  return { owner, username: identity.username, view: can("PURCHASE_RECEIPTS", "View"), create: can("PURCHASE_RECEIPTS", "Create"), edit: can("PURCHASE_RECEIPTS", "Edit"), remove: can("PURCHASE_RECEIPTS", "Delete"), exportFile: can("PURCHASE_RECEIPTS", "Export"), addSupplier: can("SUPPLIERS", "Create") };
}

/** The cooperative's wall time of an instant, as `yyyy-mm-ddTHH:mm` for the date-time picker. */
export const vnLocal = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)).replace(" ", "T");
export const nowLocal = () => vnLocal(new Date().toISOString());

/** Quantity box with − and + steps of one; typing stays free (decimals allowed). */
export function QuantityStepper({ value, onChange, label, max, invalid }: { value: string; onChange(value: string): void; label: string; max?: number; invalid?: boolean }) {
  const current = Number(value.replace(",", ".")) || 0;
  const step = (delta: number) => { const next = Math.max(0, current + delta); onChange(next ? String(max !== undefined ? Math.min(max, next) : next) : ""); };
  return <div className={styles.stepper}>
    <button type="button" aria-label={`Giảm ${label}`} tabIndex={-1} disabled={current <= 0} onClick={() => step(-1)}>−</button>
    <input aria-label={label} aria-invalid={invalid || undefined} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value.replace(/[^\d.,]/g, ""))} />
    <button type="button" aria-label={`Tăng ${label}`} tabIndex={-1} disabled={max !== undefined && current >= max} onClick={() => step(1)}>+</button>
  </div>;
}

export function MoneyInput({ value, onChange, label, disabled, invalid, className }: { value: number | null; onChange(value: number): void; label: string; disabled?: boolean; invalid?: boolean; className?: string }) {
  return <input aria-label={label} aria-invalid={invalid || undefined} inputMode="numeric" className={className} disabled={disabled} value={value ? fmt(value) : ""} onChange={(event) => onChange(digits(event.target.value))} />;
}

export function ItemFinder({ placeholder, items, onPick }: { placeholder: string; items: readonly ItemOption[]; onPick(item: ItemOption): void }) {
  const [term, setTerm] = useState(""), [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const matches = useMemo(() => { const key = term.trim().toLowerCase(); return items.filter((item) => !key || item.name.toLowerCase().includes(key) || item.code.toLowerCase().includes(key)).slice(0, 50); }, [term, items]);
  const pick = (item: ItemOption) => { onPick(item); setTerm(""); setOpen(false); };
  return <div ref={root} className={styles.finder} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
    <InterfaceIcon name="search" />
    <input type="search" aria-label={placeholder} placeholder={placeholder} value={term} onFocus={() => setOpen(true)} onChange={(event) => { setTerm(event.target.value); setOpen(true); }} onKeyDown={(event) => { if (event.key === "Enter" && matches[0]) { event.preventDefault(); pick(matches[0]); } }} />
    {open && <div className={styles.finderList}>{matches.length ? matches.map((item) => <button key={item.id} type="button" onClick={() => pick(item)}><span>{item.name}</span><small>{item.code} · {item.unit}</small></button>) : <p className={styles.empty}>Không tìm thấy hàng đang sử dụng phù hợp.</p>}</div>}
  </div>;
}

/** Search-as-you-type supplier box; a chosen supplier shows as a chip that can be cleared, `+` adds one when allowed. */
export function SupplierPicker({ suppliers, value, locked, onChange, onAdd }: { suppliers: readonly SupplierOption[]; value: string; locked?: boolean; onChange(id: string): void; onAdd?(): void }) {
  const [term, setTerm] = useState(""), [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const chosen = suppliers.find((row) => row.id === value);
  const matches = useMemo(() => { const key = term.trim().toLowerCase(); return suppliers.filter((row) => !key || row.name.toLowerCase().includes(key) || row.phone.replace(/\s/g, "").includes(key.replace(/\s/g, "")) || row.code.toLowerCase().includes(key)).slice(0, 50); }, [term, suppliers]);
  if (chosen) return <div className={styles.supplierChosen}><InterfaceIcon name="supplier" /><span><strong>{chosen.name}</strong><small>{chosen.phone}</small></span>{!locked && <button type="button" aria-label="Bỏ chọn nhà cung cấp" title="Bỏ chọn" onClick={() => onChange("")}><InterfaceIcon name="close" /></button>}</div>;
  return <div ref={root} className={`${styles.finder} ${styles.supplierFinder}`} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
    <InterfaceIcon name="search" />
    <input type="search" aria-label="Tìm nhà cung cấp" placeholder="Tìm nhà cung cấp" value={term} onFocus={() => setOpen(true)} onChange={(event) => { setTerm(event.target.value); setOpen(true); }} onKeyDown={(event) => { if (event.key === "Enter" && matches[0]) { event.preventDefault(); onChange(matches[0].id); setTerm(""); setOpen(false); } }} />
    {onAdd && <button type="button" className={styles.finderAdd} aria-label="Thêm nhà cung cấp" title="Thêm nhà cung cấp" onClick={onAdd}><InterfaceIcon name="add" /></button>}
    {open && <div className={styles.finderList}>{matches.length ? matches.map((row) => <button key={row.id} type="button" onClick={() => { onChange(row.id); setTerm(""); setOpen(false); }}><span>{row.name}</span><small>{row.phone}</small></button>) : <p className={styles.empty}>Không tìm thấy nhà cung cấp.</p>}</div>}
  </div>;
}

/** A label-left, value-right row of the document side panel. */
export function SideRow({ label, children, strong }: { label: ReactNode; children: ReactNode; strong?: boolean }) {
  return <div className={strong ? `${styles.kv} ${styles.kvStrong}` : styles.kv}><span>{label}</span><div>{children}</div></div>;
}

export function EditorFrame({ title, backHref, tools, source, children }: { title: string; backHref: string; tools?: ReactNode; source?: string; children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  useFitManagementViewport(root);
  return <section ref={root} className={`${managementStyles.theme} ${styles.editor}`} data-management-screen>
    <header className={styles.editorHead}><div className={styles.editorTitle}><Link href={backHref} className={styles.back} aria-label="Quay lại danh sách" title="Quay lại danh sách"><InterfaceIcon name="arrow" style={{ transform: "rotate(180deg)" }} /></Link><h1>{title}</h1></div>{tools}</header>
    {source && <p className={styles.source}>{source}</p>}
    {children}
  </section>;
}

export function OverflowMenu({ actionLabel, onAction }: { actionLabel: string; onAction(): void }) {
  const [open, setOpen] = useState(false);
  return <div className={styles.headRight} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <button type="button" className={managementStyles.iconButton} aria-label="Thao tác khác" aria-expanded={open} title="Thao tác khác" onClick={() => setOpen((value) => !value)}><InterfaceIcon name="list" /></button>
    {open && <div className={styles.menuPanel}><button type="button" onClick={() => { setOpen(false); onAction(); }}>{actionLabel}</button></div>}
  </div>;
}

export function QuickSupplierDialog({ onClose, onSaved }: { onClose(): void; onSaved(supplier: SupplierOption): void }) {
  const [name, setName] = useState(""), [type, setType] = useState("Seed"), [phone, setPhone] = useState(""), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  async function save() {
    setPending(true); setError(undefined);
    const result = await supplierRepository.save({ name: name.trim(), supplierType: type, phoneNumber: phone.trim(), address: null, email: null });
    setPending(false);
    if (result.status === "success") onSaved({ id: result.data.id, code: result.data.code, name: result.data.name, phone: result.data.phoneNumber });
    else setError(errorText(result));
  }
  return <Dialog open title="Thêm nhà cung cấp" mobileLayout="compact" dismissible={!pending} onOpenChange={(open) => { if (!open) onClose(); }}><div className={`${managementStyles.theme} ${styles.dialogForm}`}>
    <label className={styles.field}>Tên nhà cung cấp *<input autoFocus maxLength={200} value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label className={styles.field}>Loại *<select value={type} onChange={(event) => setType(event.target.value)}><option value="Seed">Giống</option><option value="Material">Vật tư</option><option value="Other">Khác</option></select></label>
    <label className={styles.field}>Số điện thoại *<input inputMode="tel" maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
    <p className={styles.sub}>Địa chỉ, email và giấy chứng nhận bổ sung sau ở màn hình Nhà cung cấp.</p>
    <ErrorNotice error={error} />
    <div className={styles.dialogFoot}><Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Bỏ qua</Button><Button className="w-auto" isPending={pending} disabled={!name.trim() || !phone.trim()} onClick={() => void save()}>Lưu</Button></div>
  </div></Dialog>;
}
