"use client";
import { useEffect, useRef, useState } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { workspaceError } from "@/features/api-workspace/workspace-error";
import { ErrorNotice } from "@/features/operations/ui";
import { employeeTypeLabel } from "./payroll-model";
import s from "./payroll-screen.module.css";

export type PickedEmployee = Readonly<{ id: string; code: string; name: string; phone: string; type: string }>;
const employees = createWorkspaceRepository("employees");

/**
 * "Phạm vi áp dụng" = Tùy chọn: one search box over the employees still working at the cooperative (status 401, matched by code, name or phone); the matches
 * open under the box and picking one adds the person to the table below, where it can be removed again.
 */
export function PayrollScopePicker({ picked, onChange }: { picked: ReadonlyMap<string, PickedEmployee>; onChange(next: ReadonlyMap<string, PickedEmployee>): void }) {
  const [search, setSearch] = useState(""), [open, setOpen] = useState(false), [matches, setMatches] = useState<readonly PickedEmployee[]>(), [error, setError] = useState<string>();
  const root = useRef<HTMLDivElement>(null);
  const term = search.trim();
  useEffect(() => {
    if (!term) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setError(undefined);
      void employees.list({ statusId: "401", page: "1", pageSize: "20", search: term }, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        if (result.status === "success") {
          setMatches(result.data.items.map((row) => ({ id: row.id, code: String(row.code ?? ""), name: String(row.fullName ?? ""), phone: String(row.phoneNumber ?? ""), type: String(row.employeeType ?? "") })));
        } else { setMatches([]); setError(workspaceError(result)); }
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [term]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const add = (row: PickedEmployee) => { onChange(new Map(picked).set(row.id, row)); setSearch(""); setMatches(undefined); setOpen(false); };
  const remove = (id: string) => { const next = new Map(picked); next.delete(id); onChange(next); };
  const options = term ? matches?.filter((row) => !picked.has(row.id)) : undefined;
  return <div className={s.picker} ref={root}>
    <div className={s.pickerSearch}>
      <InterfaceIcon name="search" className="size-4" />
      <input type="search" role="combobox" aria-expanded={open && !!term} aria-controls="payroll-picker-options" aria-label="Tìm nhân viên" placeholder="Tìm theo mã, tên, số điện thoại" maxLength={200} value={search} autoComplete="off"
        onChange={(event) => { setSearch(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={(event) => { if (event.key === "Escape" && open) { event.stopPropagation(); setOpen(false); } }} />
    </div>
    <ErrorNotice error={error} />
    {open && term && <ul id="payroll-picker-options" role="listbox" aria-label="Nhân viên phù hợp" aria-busy={!matches} className={s.pickerOptions}>
      {options?.map((row) => <li key={row.id} role="option" aria-selected={false} tabIndex={0} onClick={() => add(row)} onKeyDown={(event) => { if (event.key === "Enter") add(row); }}>
        <strong>{row.name}</strong><span>{row.phone || "—"}</span><span className={s.muted}>{row.code}</span>
      </li>)}
      {options && !options.length && !error && <li className={s.pickerEmpty}>Không có nhân viên phù hợp.</li>}
      {!matches && <li className={s.pickerEmpty}>Đang tìm…</li>}
    </ul>}
    <div className={s.subTable}>
      <table className={s.table}>
        <thead><tr><th>Mã nhân viên</th><th>Tên nhân viên</th><th>SĐT</th><th>Loại</th><th aria-label="Xóa" /></tr></thead>
        <tbody>
          {[...picked.values()].map((row) => <tr key={row.id}>
            <td>{row.code}</td><td>{row.name}</td><td>{row.phone || "—"}</td><td>{employeeTypeLabel(row.type)}</td>
            <td><button type="button" className={s.removeButton} aria-label={`Bỏ chọn ${row.name}`} onClick={() => remove(row.id)}><InterfaceIcon name="trash" className="size-4" /></button></td>
          </tr>)}
          {!picked.size && <tr><td colSpan={5} className={s.emptyCell}>Chưa chọn nhân viên nào.</td></tr>}
        </tbody>
      </table>
    </div>
    <p className={s.muted} role="status">Đã chọn {picked.size} nhân viên</p>
  </div>;
}
