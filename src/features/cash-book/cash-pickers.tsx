"use client";
import { SelectBox } from "@/components/ui/select-box";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { errorText } from "@/features/purchase-documents/document-parts";
import { ErrorNotice } from "@/features/operations/ui";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import type { CashAccount, CashCategory, CashDirection, Party, PartyKind, VoucherType } from "./contracts";
import { categoryLabel, createParty, listParties, removeType, saveType, userCategories, type PartyInput } from "./repository";
import styles from "./cash-book.module.css";

export function Field({ label, wide, action, children }: { label: string; wide?: boolean; action?: ReactNode; children: ReactNode }) {
  return <div className={wide ? `${styles.field} ${styles.formWide}` : styles.field}><span className={styles.labelRow}><span>{label}</span>{action}</span>{children}</div>;
}

/** Closes the panel on a click outside the picker and focuses its search box when it opens. */
function usePanel() {
  const [open, setOpen] = useState(false), root = useRef<HTMLDivElement>(null), search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return { open, setOpen, root, search };
}

function Trigger({ label, text, placeholder, open, disabled, onClick }: { label: string; text?: string; placeholder: string; open: boolean; disabled?: boolean; onClick(): void }) {
  return <button type="button" className={styles.trigger} aria-label={`${label}: ${text ?? "chưa chọn"}`} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={onClick}>
    <span data-placeholder={text ? undefined : true}>{text ?? placeholder}</span><InterfaceIcon name="chevron-down" />
  </button>;
}

/**
 * "Loại thu/chi": search, the system types first, then "Loại … tự tạo" each with an edit icon, and "+ Tạo mới" at the bottom.
 * Only types that may be chosen on a self-made voucher are listed.
 */
export function TypePicker({ direction, types, value, canManage, disabled, onChange, onTypesChanged }: {
  direction: CashDirection; types: readonly VoucherType[]; value: string; canManage: boolean; disabled?: boolean; onChange(type: VoucherType): void; onTypesChanged(chosen?: VoucherType): void;
}) {
  const { open, setOpen, root, search } = usePanel(), [term, setTerm] = useState(""), [editing, setEditing] = useState<VoucherType | "new">();
  const word = direction === "Receipt" ? "thu" : "chi";
  const choosable = useMemo(() => types.filter((type) => type.direction === direction && type.manual), [types, direction]);
  const key = foldVietnamese(term.trim());
  const matches = choosable.filter((type) => !key || foldVietnamese(type.name).includes(key));
  const system = matches.filter((type) => type.isSystem), own = matches.filter((type) => !type.isSystem);
  const chosen = types.find((type) => type.id === value);
  const pick = (type: VoucherType) => { onChange(type); setOpen(false); setTerm(""); };
  const row = (type: VoucherType) => <li key={type.id} role="option" aria-selected={type.id === value} className={styles.option} onClick={() => pick(type)}>
    <span>{type.name}</span>
    {!type.isSystem && canManage && <button type="button" className={styles.optionEdit} aria-label={`Sửa loại ${word} ${type.name}`} title="Sửa" onClick={(event) => { event.stopPropagation(); setOpen(false); setEditing(type); }}><InterfaceIcon name="pencil" /></button>}
    {type.id === value && <InterfaceIcon name="check" />}
  </li>;
  return <div ref={root} className={styles.picker}>
    <Trigger label={`Loại ${word}`} text={chosen?.name} placeholder={`Chọn loại ${word}`} open={open} disabled={disabled} onClick={() => setOpen((current) => !current)} />
    {open && <div className={styles.panel} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <div className={styles.panelSearch}><InterfaceIcon name="search" /><input ref={search} type="search" aria-label={`Tìm loại ${word}`} placeholder="Tìm kiếm" value={term} onChange={(event) => setTerm(event.target.value)} /></div>
      <ul role="listbox" aria-label={`Loại ${word}`} className={styles.options}>
        {system.map(row)}
        {own.length > 0 && <li role="presentation" className={styles.groupLabel}>Loại {word} tự tạo</li>}
        {own.map(row)}
        {!matches.length && <li className={styles.empty}>Không có loại {word} phù hợp.</li>}
      </ul>
      {canManage && <button type="button" className={styles.createRow} onClick={() => { setOpen(false); setEditing("new"); }}><InterfaceIcon name="add" />Tạo mới</button>}
    </div>}
    {editing && <TypeDialog direction={direction} type={editing === "new" ? undefined : editing} initialName={editing === "new" ? term.trim() : undefined}
      onClose={(changed, saved) => { setEditing(undefined); if (changed) onTypesChanged(saved); if (saved) onChange(saved); }} />}
  </div>;
}

/** "Tạo/Sửa loại thu|chi": name, category, description and whether it counts in the business result; Xóa on an existing one. */
export function TypeDialog({ direction, type, initialName, onClose }: { direction: CashDirection; type?: VoucherType; initialName?: string; onClose(changed: boolean, saved?: VoucherType): void }) {
  const word = direction === "Receipt" ? "thu" : "chi", categories = userCategories[direction], confirmation = useActionDialog();
  const [name, setName] = useState(type?.name ?? initialName ?? ""), [category, setCategory] = useState<CashCategory>(type?.category ?? categories[0]);
  const [description, setDescription] = useState(type?.description ?? ""), [counts, setCounts] = useState(type?.countsInResult ?? true), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  async function save() {
    if (!name.trim()) { setError(`Nhập tên loại ${word}.`); return; }
    setPending(true); setError(undefined);
    const result = await saveType({ direction, category, name, description, countsInResult: counts }, type?.id, type?.rowVersion);
    setPending(false);
    if (result.status === "success") onClose(true, result.data); else setError(result.code === "MSG-GEN-02" ? `Đã có loại ${word} tên “${name.trim()}”.` : errorText(result));
  }
  async function remove() {
    if (!type || !(await confirmation.confirm(`Xóa loại ${word} “${type.name}”? Các phiếu đã dùng loại này vẫn giữ tên cũ.`))) return;
    setPending(true);
    const result = await removeType(type.id);
    setPending(false);
    if (result.status === "success") onClose(true); else setError(errorText(result));
  }
  return <Dialog open size="md" dismissible={!pending} title={`${type ? "Sửa" : "Tạo"} loại ${word}`} onOpenChange={(open) => { if (!open) onClose(false); }}><div className={managementStyles.theme}>{confirmation.dialog}
    <div className={styles.formGrid}>
      <Field label={`Tên loại ${word}`} wide><input className={styles.input} autoFocus maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></Field>
      <Field label={`Danh mục ${word}`} wide><SelectBox className={styles.input} value={category} onChange={(event) => setCategory(event.target.value as CashCategory)}>{categories.map((key) => <option key={key} value={key}>{categoryLabel[key]}</option>)}</SelectBox></Field>
      <Field label="Mô tả" wide><textarea className={styles.textarea} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
      <label className={`${styles.check} ${styles.formWide}`}><input type="checkbox" checked={counts} onChange={(event) => setCounts(event.target.checked)} />Hạch toán vào kết quả hoạt động kinh doanh</label>
    </div>
    <ErrorNotice error={error} />
    <footer className={styles.foot}>
      <div>{type && <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => void remove()}><InterfaceIcon name="trash" className="size-4" />Xóa</Button>}</div>
      <div><Button className="w-auto" variant="secondary" disabled={pending} onClick={() => onClose(false)}>Bỏ qua</Button><Button className="w-auto" isPending={pending} onClick={() => void save()}>Lưu</Button></div>
    </footer>
  </div></Dialog>;
}

/** Picks the payer/receiver of the chosen kind with a server search; the voucher keeps its name even if the record changes later. */
export function PartyPicker({ kind, value, label, disabled, onChange }: { kind: PartyKind; value: { id: string; name: string } | null; label: string; disabled?: boolean; onChange(party: Party | null): void }) {
  const { open, setOpen, root, search } = usePanel(), [term, setTerm] = useState(""), [rows, setRows] = useState<Party[]>(), [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(() => void listParties(kind, term, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setFailed(result.status !== "success"); setRows(result.status === "success" ? result.data : []);
    }), 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, kind, term]);
  const pick = (party: Party | null) => { onChange(party); setOpen(false); setTerm(""); };
  return <div ref={root} className={styles.picker}>
    <Trigger label={label} text={value?.name} placeholder={`Tìm ${label.toLowerCase()}`} open={open} disabled={disabled} onClick={() => setOpen((current) => !current)} />
    {open && <div className={styles.panel} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <div className={styles.panelSearch}><InterfaceIcon name="search" /><input ref={search} type="search" aria-label={`Tìm ${label.toLowerCase()}`} placeholder="Tìm theo tên, mã, số điện thoại" value={term} onChange={(event) => setTerm(event.target.value)} /></div>
      <ul role="listbox" aria-label={label} className={styles.options}>
        {value && <li role="option" aria-selected={false} className={styles.option} onClick={() => pick(null)}><span className={styles.muted}>Bỏ chọn</span></li>}
        {(rows ?? []).map((party) => <li key={party.id} role="option" aria-selected={party.id === value?.id} className={styles.option} onClick={() => pick(party)}>
          <span>{party.name}{(party.code || party.phoneNumber) && <small>{[party.code, party.phoneNumber].filter(Boolean).join(" · ")}</small>}</span>{party.id === value?.id && <InterfaceIcon name="check" />}
        </li>)}
        {!rows && <li className={styles.empty}>Đang tải…</li>}
        {rows && !rows.length && <li className={styles.empty}>{failed ? "Không tải được danh sách." : "Không tìm thấy."}</li>}
      </ul>
    </div>}
  </div>;
}

/** "Tạo người nộp/nhận" for the kind Khác: name required, the rest optional. */
export function PartyDialog({ title, onClose }: { title: string; onClose(party?: Party): void }) {
  const [values, setValues] = useState<PartyInput>({ name: "", phoneNumber: "", address: "", area: "", ward: "", note: "" }), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  const set = (key: keyof PartyInput) => (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value }));
  async function save() {
    if (!values.name.trim()) { setError("Nhập tên."); return; }
    setPending(true); setError(undefined);
    const result = await createParty(values);
    setPending(false);
    if (result.status === "success") onClose(result.data); else setError(errorText(result));
  }
  return <Dialog open size="md" dismissible={!pending} title={title} onOpenChange={(open) => { if (!open) onClose(); }}><div className={managementStyles.theme}>
    <div className={styles.formGrid}>
      <Field label="Tên *"><input className={styles.input} autoFocus placeholder="Bắt buộc" maxLength={200} value={values.name} onChange={set("name")} /></Field>
      <Field label="Điện thoại"><input className={styles.input} inputMode="tel" maxLength={20} placeholder="Nhập số điện thoại" value={values.phoneNumber} onChange={set("phoneNumber")} /></Field>
      <Field label="Địa chỉ" wide><input className={styles.input} maxLength={500} placeholder="Nhập địa chỉ" value={values.address} onChange={set("address")} /></Field>
      <Field label="Khu vực"><input className={styles.input} maxLength={100} placeholder="Tỉnh/Thành phố" value={values.area} onChange={set("area")} /></Field>
      <Field label="Phường/Xã"><input className={styles.input} maxLength={100} placeholder="Phường/Xã" value={values.ward} onChange={set("ward")} /></Field>
      <Field label="Ghi chú" wide><textarea className={styles.textarea} maxLength={1000} placeholder="Nhập ghi chú" value={values.note} onChange={set("note")} /></Field>
    </div>
    <ErrorNotice error={error} />
    <footer className={styles.foot}><div /><div><Button className="w-auto" variant="secondary" disabled={pending} onClick={() => onClose()}>Bỏ qua</Button><Button className="w-auto" isPending={pending} onClick={() => void save()}>Lưu</Button></div></footer>
  </div></Dialog>;
}

/** A bank or e-wallet account: number and provider on the first line, holder below (as on the voucher form). */
export function AccountPicker({ accounts, value, label, disabled, onChange }: { accounts: readonly CashAccount[]; value: string; label: string; disabled?: boolean; onChange(id: string): void }) {
  const { open, setOpen, root } = usePanel(), chosen = accounts.find((account) => account.id === value);
  return <div ref={root} className={styles.picker}>
    <Trigger label={label} text={chosen ? `${chosen.accountNumber} - ${chosen.providerName}` : undefined} placeholder="Chọn tài khoản" open={open} disabled={disabled} onClick={() => setOpen((current) => !current)} />
    {open && <div className={styles.panel} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <ul role="listbox" aria-label={label} className={styles.options}>
        {accounts.map((account) => <li key={account.id} role="option" aria-selected={account.id === value} className={styles.option} onClick={() => { onChange(account.id); setOpen(false); }}>
          <span><strong>{account.accountNumber}</strong> - {account.providerName}<small>{account.holderName}</small></span>{account.id === value && <InterfaceIcon name="check" />}
        </li>)}
        {!accounts.length && <li className={styles.empty}>Chưa có tài khoản. Thêm trong Thiết lập → Sổ quỹ.</li>}
      </ul>
    </div>}
  </div>;
}
