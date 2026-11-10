"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { createOperationsRepository } from "@/features/operations/repository";
import { useMutation } from "@/features/operations/ui";
import { employeeViewSchema, type Employee } from "./contracts";
import { fieldLabels, valuesOf } from "./employee-editor-model";
import { employeeTabSaveBody, inlineSchemas, mergeEmployeeTab } from "./employee-inline-model";
import type { EmployeeTabKey } from "./employee-tabs";

export type EmployeeLeaveGuard = (leave: () => void) => void;
type EditableTab = Exclude<EmployeeTabKey, "account">;
type Issue = { path: string; message: string };
export function useEmployeeInlineEditor({ employee, active, setActive, zones, lookupsReady, onSaved, onGuardChange }: {
  employee: Employee; active: EmployeeTabKey; setActive(tab: EmployeeTabKey): void; zones: ApiRecord[]; lookupsReady: boolean;
  onSaved(employee: Employee): void; onGuardChange?(guard: EmployeeLeaveGuard | undefined): void;
}) {
  const repository = useMemo(() => createOperationsRepository("employees"), []), mutation = useMutation();
  const [editing, setEditing] = useState<EditableTab>();
  const [baseline, setBaseline] = useState(employee), [values, setValues] = useState(() => valuesOf(employee));
  const [issues, setIssues] = useState<Issue[]>([]), [latest, setLatest] = useState<Employee>();
  const [compared, setCompared] = useState<Employee>();
  const [leave, setLeave] = useState<(() => void)>();
  const formRef = useRef<HTMLFormElement>(null), editButton = useRef<HTMLButtonElement>(null);
  const dirty = !!editing && JSON.stringify(mergeEmployeeTab(baseline, values, editing)) !== JSON.stringify(valuesOf(baseline));
  const guard = useCallback<EmployeeLeaveGuard>((next) => { if (mutation.busy()) return; if (dirty) setLeave(() => next); else { setEditing(undefined); next(); } }, [dirty, mutation]);
  // The directory stores this callback in a ref, so merely registering it cannot rerender the list.
  useEffect(() => { onGuardChange?.(guard); return () => onGuardChange?.(undefined); }, [onGuardChange, guard]);
  const restoreFocus = () => requestAnimationFrame(() => editButton.current?.focus());
  function cancel() { if (mutation.busy()) return; setValues(valuesOf(employee)); setIssues([]); setEditing(undefined); setLeave(undefined); mutation.reviewed(); restoreFocus(); }
  function begin() {
    if (active === "account" || !employee.canMaintain || mutation.busy()) return;
    setBaseline(employee); setValues(valuesOf(employee)); setIssues([]); setLatest(undefined); setCompared(undefined); mutation.reviewed(); setEditing(active);
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea')?.focus());
  }
  const problem = mutation.failure?.employeeProblem;
  function fieldError(path: string) {
    const local = issues.find(issue => issue.path === path || issue.path.startsWith(path + "."))?.message;
    if (local) return local;
    if (problem?.kind === "invalid-fields" && problem.fields.some(field => { const key = fieldLabels[field][0]; return path === key || path.startsWith(key + "."); })) return "Kiểm tra giá trị đã nhập.";
    if (path === "phone" && mutation.failure?.code === "MSG03") return "Số điện thoại đã có trong hồ sơ nhân viên khác.";
  }
  const errorProps = (name: string) => ({ name, "aria-invalid": !!fieldError(name), "aria-describedby": fieldError(name) ? `employee-inline-error-${name}` : name.startsWith("bankAccount.") ? "employee-api-bank-help" : undefined });
  async function save(removeBank = false) {
    const tab = removeBank ? "bank" : editing;
    if (!tab || mutation.busy() || mutation.blocked || !employee.canMaintain || !lookupsReady) return;
    const base = editing ? baseline : employee;
    const draft = removeBank ? { ...valuesOf(base), bankAccount: { bankName: "", accountNumber: "", accountHolderName: "" } } : values;
    const checked = inlineSchemas[tab].safeParse(draft);
    const next: Issue[] = checked.success ? [] : checked.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message }));
    if (tab === "work") {
      if (!draft.employeeType && base.employeeType) next.push({ path: "employeeType", message: "Chọn loại nhân viên." });
      if (draft.employeeType && draft.employeeType !== base.employeeType && !draft.employeeTypeFrom) next.push({ path: "employeeTypeFrom", message: "Chọn ngày áp dụng loại nhân viên." });
      if (!draft.workingZoneIds.length) next.push({ path: "workingZoneIds", message: "Chọn ít nhất một vùng làm việc." });
      if (draft.workingZoneIds.some(id => zones.find(zone => zone.id === id)?.statusId !== 101)) next.push({ path: "workingZoneIds", message: "Bỏ chọn vùng đã ngừng hoặc chưa có trong danh mục trước khi lưu." });
    }
    setIssues(next);
    if (next.length || !checked.success) { requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()); return; }
    const normalized = { ...draft, ...checked.data };
    const result = await mutation.run(() => repository.write("update", employeeTabSaveBody(base, normalized, tab), employeeViewSchema, base.id));
    if (result) { setEditing(undefined); setLeave(undefined); setIssues([]); onSaved(result); restoreFocus(); }
  }
  async function compareDuplicate() {
    if (!problem || problem.kind === "invalid-fields") return;
    const record = await mutation.run(() => repository.read("detail", { id: problem.existingEmployeeId }, employeeViewSchema), true);
    if (record) setCompared(record);
  }
  const zoneOptions: ApiRecord[] = [...zones, ...baseline.workingZones.filter(zone => !zones.some(option => option.id === zone.id))];
  return { repository, mutation, editing, baseline, values, setValues, issues, latest, setLatest, compared, formRef, editButton, dirty, leave,
    fieldError, errorProps, begin, cancel, save, compareDuplicate, problem, guard,
    stay: () => setLeave(undefined), discard: () => { const next = leave; cancel(); next?.(); },
    changeTab: (tab: EmployeeTabKey) => { if (tab !== active) guard(() => setActive(tab)); },
    adopt: (record: Employee) => { setEditing(undefined); setValues(valuesOf(record)); mutation.reviewed(); onSaved(record); restoreFocus(); },
    keepDraft: (record: Employee) => { setBaseline(record); setValues(mergeEmployeeTab(record, values, editing!)); setLatest(undefined); mutation.reviewed(); },
    zoneOptions, availableZones: zoneOptions.filter(zone => zone.statusId === 101 || values.workingZoneIds.includes(zone.id)),
  };
}
