"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import type {
  EmployeeListItemDto,
} from "@/features/employee-management/api/employee-contract.schemas";
import { createEmployeeEndDateSchema } from "@/features/employee-management/schemas/employee-employment-schema";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday, useMutation } from "@/features/operations/ui";
import { employeeViewSchema, employmentChangedSchema, type Employee, type EmploymentChange } from "./contracts";
import {
  employeeApiEditorSchema,
  buildEmployeeSaveBody,
  fieldLabels,
  valuesOf,
} from "./employee-editor-model";
import type { EmployeeStatusAction } from "./employee-status-action-dialog";
import type { EmployeeTabKey } from "./employee-tabs";
import { employeeFieldTab, focusEmployeeField } from "./employee-editor-validation";

type Issue = { path: string; message: string };

export type EmployeeEditorProps = {
  record: Employee | null;
  zones: ApiRecord[];
  jobTypes: { id: string; name: string }[];
  lookupsReady: boolean;
  onClose(): void;
  onAdopt(employee: Employee): void;
  onSaved(employee: Employee, followUp?: EmploymentChange): void;
};

export function useEmployeeEditor({ record, zones, lookupsReady, onClose, onSaved }: EmployeeEditorProps) {
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const mutation = useMutation();
  // Server copy the draft is based on; replaced after an accepted conflict review.
  const [baseline, setBaseline] = useState(record);
  const [values, setValues] = useState(() => valuesOf(record));
  const [issues, setIssues] = useState<Issue[]>([]);
  const [activeTab, setActiveTab] = useState<EmployeeTabKey>("information");
  const [latest, setLatest] = useState<Employee>();
  const [compared, setCompared] = useState<Employee>();
  const [comparisonTarget, setComparisonTarget] = useState<{ id: string; linked: boolean }>();
  const [action, setAction] = useState<EmployeeStatusAction>();
  const [endDate, setEndDate] = useState(businessToday);
  const [actionError, setActionError] = useState<string>();
  const [discard, setDiscard] = useState(false);
  const [reconciledRows, setReconciledRows] = useState<EmployeeListItemDto[]>();
  const formRef = useRef<HTMLFormElement>(null);
  // Guards state updates after an awaited status action when the dialog has unmounted.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const dirty = JSON.stringify(values) !== JSON.stringify(valuesOf(baseline));
  // Catalogue zones plus saved zones that are no longer in the catalogue.
  const zoneOptions: ApiRecord[] = [
    ...zones,
    ...(baseline?.workingZones ?? []).filter((zone) => !zones.some((entry) => entry.id === zone.id)),
  ];
  const inactiveZones = values.workingZoneIds.filter((id) => zones.find((zone) => zone.id === id)?.statusId !== 101);
  const availableZones = zoneOptions.filter((zone) => zone.statusId === 101 || values.workingZoneIds.includes(zone.id));

  function close() {
    if (mutation.busy()) return;
    if (dirty) setDiscard(true);
    else onClose();
  }

  const problem = mutation.failure?.employeeProblem;
  const invalidServerFields =
    problem?.kind === "invalid-fields" ? problem.fields.map((field) => fieldLabels[field][0]) : [];
  const errorTabs = [...new Set([...issues.map(issue => issue.path), ...invalidServerFields].map(employeeFieldTab))];
  const firstServerField = invalidServerFields[0];
  useEffect(() => {
    if (!firstServerField) return;
    const frame = requestAnimationFrame(() => {
      setActiveTab(employeeFieldTab(firstServerField));
      requestAnimationFrame(() => focusEmployeeField(formRef.current, firstServerField));
    });
    return () => cancelAnimationFrame(frame);
  }, [firstServerField, mutation.failure]);

  function errorProps(name: string) {
    return {
      name,
      "aria-invalid":
        issues.some((issue) => issue.path === name) ||
        invalidServerFields.some((field) => field === name || name.startsWith(field + ".")),
      "aria-describedby":
        [
          name.startsWith("bankAccount.") ? "employee-api-bank-help" : undefined,
          issues.length ? "employee-api-errors" : invalidServerFields.length ? "employee-api-server-errors" : undefined,
        ]
          .filter(Boolean)
          .join(" ") || undefined,
    };
  }

  /** Shows validation issues and moves focus to the first invalid field. */
  function showIssues(next: Issue[]) {
    setIssues(next);
    if (!next[0]) return;
    setActiveTab(employeeFieldTab(next[0].path));
    requestAnimationFrame(() => focusEmployeeField(formRef.current, next[0].path));
  }

  async function save() {
    if (mutation.busy() || mutation.blocked || !lookupsReady || (baseline && !baseline.canMaintain)) return;
    const checked = employeeApiEditorSchema.safeParse({
      ...values,
      status: baseline?.status === "Left" ? "left" : "employed",
    });
    if (!checked.success) {
      showIssues(checked.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })));
      return;
    }
    if (!values.employeeType && (!baseline || baseline.employeeType)) {
      showIssues([{ path: "employeeType", message: "Chọn loại nhân viên." }]); return;
    }
    if (baseline && values.employeeType && values.employeeType !== baseline.employeeType && !values.employeeTypeFrom) {
      showIssues([{ path: "employeeTypeFrom", message: "Chọn ngày áp dụng loại nhân viên." }]); return;
    }
    if (!baseline && !values.workingZoneIds.length) {
      showIssues([{ path: "workingZoneIds", message: "Chọn ít nhất một vùng làm việc." }]); return;
    }
    if (inactiveZones.length) {
      showIssues([
        { path: "workingZoneIds", message: "Bỏ chọn vùng đã ngừng hoặc chưa có trong danh mục trước khi lưu." },
      ]);
      return;
    }
    setIssues([]);
    setComparisonTarget(undefined);
    setCompared(undefined);
    const body = buildEmployeeSaveBody(checked.data, baseline);
    const result = await mutation.run(() =>
      repository.write(baseline ? "update" : "create", body, employeeViewSchema, baseline?.id),
    );
    if (result) onSaved(result);
  }

  async function confirmAction() {
    if (!baseline || !action || mutation.busy() || mutation.blocked || dirty || !baseline.canMaintain) return;
    if (action === "end-employment" && !createEmployeeEndDateSchema().safeParse({ endDate }).success) {
      setActionError("Ngày nghỉ việc phải hợp lệ và không sau hôm nay."); return;
    }
    setIssues([]);
    const next = await mutation.run(() => repository.write(action,
      { rowVersion: baseline.rowVersion, ...(action === "end-employment" ? { lastWorkingDay: endDate } : {}) },
      employmentChangedSchema, baseline.id));
    if (!alive.current) return;
    setAction(undefined);
    if (next) onSaved(next.employee, next);
  }

  /** Loads the existing profile named by the last comparison target or by the server's duplicate problem. */
  async function openComparison() {
    const target =
      comparisonTarget ??
      (problem && problem.kind !== "invalid-fields"
        ? { id: problem.existingEmployeeId, linked: problem.kind === "account-already-linked" }
        : undefined);
    if (!target || mutation.busy()) return;
    setComparisonTarget(target);
    const next = await mutation.run(() => repository.read("detail", { id: target.id }, employeeViewSchema), true);
    if (next) setCompared(next);
  }

 return { repository, mutation, baseline, setBaseline, values, setValues, issues, setIssues, activeTab, setActiveTab, errorTabs, latest, setLatest, compared, setCompared, comparisonTarget, action, setAction, endDate, setEndDate, actionError, setActionError, discard, setDiscard, reconciledRows, setReconciledRows, formRef, dirty, zoneOptions, availableZones, close, problem, errorProps, save, confirmAction, openComparison };
}
