"use client";
import { useEffect, useState } from "react";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { ErrorNotice } from "@/features/operations/ui";
import { workspaceError } from "@/features/api-workspace/workspace-error";
import s from "./payroll-screen.module.css";

export type PickedEmployee = Readonly<{ id: string; name: string }>;
const employees = createWorkspaceRepository("employees");

/**
 * "Phạm vi áp dụng" = Tùy chọn: a searchable checklist of the employees still working at the cooperative (status 401), read
 * through the employees repository. Picks survive a new search, so employees found by different searches can be combined.
 */
export function PayrollScopePicker({ picked, onChange }: { picked: ReadonlyMap<string, string>; onChange(next: ReadonlyMap<string, string>): void }) {
  const [search, setSearch] = useState(""), [rows, setRows] = useState<readonly PickedEmployee[]>(), [error, setError] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setError(undefined);
      void employees.list({ statusId: "401", page: "1", pageSize: "100", ...(search.trim() ? { search: search.trim() } : {}) }, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        if (result.status === "success") setRows(result.data.items.map((row) => ({ id: row.id, name: String(row.fullName ?? "") })));
        else { setRows([]); setError(workspaceError(result)); }
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search]);
  const toggle = (row: PickedEmployee, on: boolean) => { const next = new Map(picked); if (on) next.set(row.id, row.name); else next.delete(row.id); onChange(next); };
  return <div className={s.picker}>
    <input type="search" aria-label="Tìm nhân viên" placeholder="Tìm nhân viên theo tên hoặc số điện thoại" maxLength={200} value={search} onChange={(event) => setSearch(event.target.value)} />
    <ErrorNotice error={error} />
    <div className={s.pickerList} role="group" aria-label="Danh sách nhân viên" aria-busy={!rows}>
      {rows?.map((row) => <label key={row.id}><input type="checkbox" checked={picked.has(row.id)} onChange={(event) => toggle(row, event.target.checked)} />{row.name}</label>)}
      {rows && !rows.length && !error && <p className={s.muted}>Không có nhân viên phù hợp.</p>}
    </div>
    <p className={s.muted} role="status">Đã chọn {picked.size} nhân viên</p>
  </div>;
}
