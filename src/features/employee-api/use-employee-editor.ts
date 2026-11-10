"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import type { EmployeeListItemDto } from "@/features/employee-management/api/employee-contract.schemas";
import { createOperationsRepository } from "@/features/operations/repository";
import { useMutation } from "@/features/operations/ui";
import { employeeViewSchema, type Employee } from "./contracts";
import { employeeCreateReceiptSchema } from "./employee-create-contract";
import { blankCreateValues, groupsWithIssues, parseEmployeeCreate, type EmployeeCreateIssue } from "./employee-create-model";
import { defaultOpenGroups, focusEmployeeField, type EmployeeCreateGroup } from "./employee-editor-validation";
import { fieldLabels } from "./employee-editor-model";

export type EmployeeEditorProps = {
  /** The dialog only creates; editing an opened row happens in place. */
  record?: null;
  zones: ApiRecord[];
  jobTypes: { id: string; name: string }[];
  lookupsReady: boolean;
  onClose(): void;
  onAdopt(employee: Employee): void;
  onSaved(employee: Employee): void;
};

type Credential = { username: string; password: string; expiresAt: string };

/** State and save flow of the "Thêm nhân viên" dialog. */
export function useEmployeeEditor({ zones, lookupsReady, onClose, onSaved }: EmployeeEditorProps) {
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const mutation = useMutation();
  const [values, setValues] = useState(blankCreateValues);
  const [issues, setIssues] = useState<EmployeeCreateIssue[]>([]);
  const [open, setOpen] = useState<ReadonlySet<EmployeeCreateGroup>>(() => new Set(defaultOpenGroups));
  const [focusRequest, setFocusRequest] = useState<{ path: string }>();
  const [compared, setCompared] = useState<Employee>();
  const [comparisonTarget, setComparisonTarget] = useState<string>();
  const [reconciledRows, setReconciledRows] = useState<EmployeeListItemDto[]>();
  const [discard, setDiscard] = useState(false);
  // One-time password: component state only, cleared on acknowledgement, never logged or cached.
  const [credential, setCredential] = useState<Credential>();
  const savedEmployee = useRef<Employee | undefined>(undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => () => { savedEmployee.current = undefined; }, []);

  const dirty = JSON.stringify(values) !== JSON.stringify(blankCreateValues());
  const inactiveZoneIds = values.workingZoneIds.filter(id => zones.find(zone => zone.id === id)?.statusId !== 101);

  const failure = mutation.failure;
  const problem = failure?.employeeProblem;
  // Server-reported fields and a taken username/email, shown next to the same inputs as local issues.
  const serverIssues = useMemo<EmployeeCreateIssue[]>(() => {
    if (problem?.kind === "invalid-fields") {
      return problem.fields.map(field => ({ path: fieldLabels[field][0] === "accountId" ? "username" : fieldLabels[field][0], message: "Kiểm tra lại mục này." }));
    }
    return failure?.code === "MSG-ACCOUNT-09" ? [{ path: "username", message: "Tên đăng nhập hoặc email đã được sử dụng." }] : [];
  }, [failure, problem]);
  const allIssues = useMemo(() => [...issues, ...serverIssues], [issues, serverIssues]);
  const errorGroups = useMemo(() => groupsWithIssues(allIssues), [allIssues]);

  /** Opens the groups holding errors and asks the focus effect to move to the first invalid field. */
  const reveal = (next: readonly EmployeeCreateIssue[]) => {
    if (!next.length) return;
    setOpen(current => new Set([...current, ...groupsWithIssues(next)]));
    setFocusRequest({ path: next[0].path });
  };
  // A server rejection reveals its groups once the failure arrives.
  useEffect(() => {
    if (!serverIssues.length) return;
    const frame = requestAnimationFrame(() => {
      setOpen(current => new Set([...current, ...groupsWithIssues(serverIssues)]));
      setFocusRequest({ path: serverIssues[0].path });
    });
    return () => cancelAnimationFrame(frame);
  }, [serverIssues]);
  // Runs after the group is visible, so the focus call can reach the control.
  useEffect(() => { if (focusRequest) focusEmployeeField(formRef.current, focusRequest.path); }, [focusRequest]);

  function fieldError(path: string) {
    return allIssues.find(issue => issue.path === path || (path === "bankAccount.bankName" && issue.path === "bankAccount"))?.message;
  }
  function errorProps(name: string) {
    return {
      name,
      "aria-invalid": allIssues.some(issue => issue.path === name || name.startsWith(issue.path + ".")),
      "aria-describedby": [name.startsWith("bankAccount.") ? "employee-create-bank-help" : undefined, fieldError(name) ? `employee-create-error-${name}` : undefined].filter(Boolean).join(" ") || undefined,
    };
  }
  function toggleGroup(key: EmployeeCreateGroup) {
    setOpen(current => { const next = new Set(current); if (!next.delete(key)) next.add(key); return next; });
  }
  function close() {
    if (mutation.busy()) return;
    if (dirty) setDiscard(true); else onClose();
  }

  async function save() {
    if (mutation.busy() || mutation.blocked || !lookupsReady) return;
    const parsed = parseEmployeeCreate(values, inactiveZoneIds);
    if (!parsed.ok) { setIssues(parsed.issues); reveal(parsed.issues); return; }
    setIssues([]); setComparisonTarget(undefined); setCompared(undefined); setDiscard(false);
    const account = parsed.body.account;
    if (account) {
      const receipt = await mutation.run(() => repository.write("create", parsed.body, employeeCreateReceiptSchema));
      if (!receipt) return;
      savedEmployee.current = receipt.employee;
      setCredential({ username: receipt.employee.account?.username ?? account.username, password: receipt.temporaryPassword, expiresAt: receipt.temporaryPasswordExpiresAt });
      return;
    }
    const created = await mutation.run(() => repository.write("create", parsed.body, employeeViewSchema));
    if (created) onSaved(created);
  }

  /** The one-time credential is destroyed here; the list is told about the new employee afterwards. */
  function acknowledgeCredential() {
    setCredential(undefined);
    const saved = savedEmployee.current;
    savedEmployee.current = undefined;
    if (saved) onSaved(saved);
  }

  /** Loads the existing profile named by the duplicate problem so the user can compare. */
  async function openComparison() {
    const target = comparisonTarget ?? (problem?.kind === "duplicate-employee" ? problem.existingEmployeeId : undefined);
    if (!target || mutation.busy()) return;
    setComparisonTarget(target);
    const next = await mutation.run(() => repository.read("detail", { id: target }, employeeViewSchema), true);
    if (next) setCompared(next);
  }

  return { repository, mutation, values, setValues, issues: allIssues, open, errorGroups, toggleGroup, compared, setCompared, comparisonTarget, reconciledRows, setReconciledRows, discard, setDiscard, credential, formRef, dirty, problem, fieldError, errorProps, close, save, acknowledgeCredential, openComparison };
}
