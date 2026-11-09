"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import type {
  EmployeeListItemDto,
  LinkableEmployeeAccountDto,
} from "@/features/employee-management/api/employee-contract.schemas";
import { employeeEditorSchema } from "@/features/employee-management/schemas/employee-editor-schema";
import { createEmployeeEndDateSchema } from "@/features/employee-management/schemas/employee-employment-schema";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday, ErrorNotice, useMutation } from "@/features/operations/ui";
import { employeeViewSchema, employmentChangedSchema, type Employee, type EmploymentChange } from "./contracts";
import { EmployeeConflictPanel } from "./employee-conflict-panel";
import { EmployeeEditorFields } from "./employee-editor-fields";
import {
  buildEmployeeSaveBody,
  dateLabel,
  employmentLabel,
  fieldLabels,
  localFieldLabels,
  valuesOf,
} from "./employee-editor-model";
import { ProfileComparison } from "./employee-profile-comparison";
import styles from "./employee-screen.module.css";
import { EmployeeStatusActionDialog, type EmployeeStatusAction } from "./employee-status-action-dialog";

type Issue = { path: string; message: string };

type EmployeeEditorProps = {
  record: Employee | null;
  zones: ApiRecord[];
  accounts: LinkableEmployeeAccountDto[];
  lookupsReady: boolean;
  onClose(): void;
  onReloadAccounts(): void;
  onAdopt(employee: Employee): void;
  onSaved(employee: Employee, followUp?: EmploymentChange): void;
  onUnlinked(employee: Employee): void;
};

/** Create/edit dialog for a seasonal employee, including account link and employment status changes. */
export function EmployeeApiEditor({
  record,
  zones,
  accounts,
  lookupsReady,
  onClose,
  onReloadAccounts,
  onAdopt,
  onSaved,
  onUnlinked,
}: EmployeeEditorProps) {
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const mutation = useMutation();
  // Server copy the draft is based on; replaced after unlink or an accepted conflict review.
  const [baseline, setBaseline] = useState(record);
  const [values, setValues] = useState(() => valuesOf(record));
  const [issues, setIssues] = useState<Issue[]>([]);
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
  // The currently linked account first, then linkable accounts, without duplicates.
  const accountOptions = [...(baseline?.account ? [baseline.account] : []), ...accounts].filter(
    (entry, i, all) => all.findIndex((option) => option.id === entry.id) === i,
  );

  function close() {
    if (mutation.busy()) return;
    if (dirty) setDiscard(true);
    else onClose();
  }

  const problem = mutation.failure?.employeeProblem;
  const invalidServerFields =
    problem?.kind === "invalid-fields" ? problem.fields.map((field) => fieldLabels[field][0]) : [];

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
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${next[0]?.path}"]`)?.focus());
  }

  async function save() {
    if (mutation.busy() || mutation.blocked || !lookupsReady) return;
    const checked = employeeEditorSchema.safeParse({
      ...values,
      status: baseline?.status === "Left" ? "left" : "employed",
    });
    if (!checked.success) {
      showIssues(checked.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })));
      return;
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
    // Employment changes need a clean draft; unlinking keeps other unsaved edits.
    if (!baseline || !action || mutation.busy() || mutation.blocked || (action !== "unlink" && dirty)) return;
    if (action === "end-employment" && !createEmployeeEndDateSchema().safeParse({ endDate }).success) {
      setActionError("Ngày nghỉ việc phải hợp lệ và không sau hôm nay.");
      return;
    }
    setIssues([]);
    if (action === "unlink") {
      const next = await mutation.run(() =>
        repository.write("unlink", { rowVersion: baseline.rowVersion }, employeeViewSchema, baseline.id),
      );
      if (!alive.current) return;
      setAction(undefined);
      if (next) {
        // Keep a newly chosen account; drop the selection if it was the account just unlinked.
        const selected = values.accountId;
        setBaseline(next);
        setValues((current) => ({
          ...current,
          accountId: selected && selected !== baseline.account?.id ? selected : "",
        }));
        onUnlinked(next);
      }
    } else {
      const next = await mutation.run(() =>
        repository.write(
          action,
          { rowVersion: baseline.rowVersion, ...(action === "end-employment" ? { endDate } : {}) },
          employmentChangedSchema,
          baseline.id,
        ),
      );
      if (!alive.current) return;
      setAction(undefined);
      if (next) onSaved(next.employee, next);
    }
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

  return (
    <Dialog
      open
      title={baseline ? `Hồ sơ · ${baseline.fullName}` : "Thêm nhân viên"}
      size="lg"
      dismissible={!mutation.pending && !action}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <ErrorNotice
        error={
          mutation.failure?.code === "MSG24"
            ? "Tài khoản này đã được liên kết với hồ sơ nhân viên khác."
            : mutation.error
        }
      />
      {problem?.kind === "invalid-fields" && (
        <p id="employee-api-server-errors" role="alert" className="my-3">
          Các mục cần kiểm tra: {problem.fields.map((field) => fieldLabels[field][1]).join(", ")}.
        </p>
      )}
      {issues.length > 0 && (
        <ul id="employee-api-errors" role="alert" className="my-4 space-y-2 text-danger">
          {issues.map((issue, index) => (
            <li key={`${issue.path}-${index}`}>
              {localFieldLabels[issue.path] ? `${localFieldLabels[issue.path]}: ` : ""}
              {issue.message}
            </li>
          ))}
        </ul>
      )}
      {(comparisonTarget || (problem && problem.kind !== "invalid-fields")) && (
        <div className="my-4">
          <Button className="w-auto" variant="secondary" isPending={mutation.pending} onClick={openComparison}>
            {comparisonTarget?.linked || problem?.kind === "account-already-linked"
              ? "Mở hồ sơ đang liên kết"
              : "Đối chiếu hồ sơ hiện có"}
          </Button>
        </div>
      )}
      {compared && (
        <div className="my-4 rounded-control border border-border p-4">
          <ProfileComparison employee={compared} />
          <Button className="mt-3 w-auto" variant="secondary" onClick={() => onAdopt(compared)}>
            Mở hồ sơ này và bỏ nháp hiện tại
          </Button>
        </div>
      )}
      {baseline && (
        <div className={styles.employment}>
          <p className="font-semibold">
            {employmentLabel(baseline.status)}
            {baseline.employmentEndDate ? ` · Ngày nghỉ: ${dateLabel(baseline.employmentEndDate)}` : ""}
          </p>
          <Button
            className="mt-3 sm:w-auto"
            variant="secondary"
            disabled={dirty || mutation.pending || mutation.blocked}
            onClick={() => {
              if (!dirty && !mutation.busy()) {
                setEndDate(businessToday());
                setAction(baseline.status === "Employed" ? "end-employment" : "reinstate");
              }
            }}
          >
            {baseline.status === "Employed" ? "Nghỉ việc" : "Đi làm lại"}
          </Button>
          {dirty && (
            <p className="mt-3 text-sm text-text-muted">Lưu hoặc hủy bản nháp trước khi đổi tình trạng làm việc.</p>
          )}
        </div>
      )}
      <form
        className={styles.editor}
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={mutation.pending || mutation.blocked || !!action} className="space-y-4">
          <EmployeeEditorFields
            values={values}
            setValues={setValues}
            errorProps={errorProps}
            baseline={baseline}
            availableZones={availableZones}
            zoneOptions={zoneOptions}
            accountOptions={accountOptions}
            lookupsReady={lookupsReady}
            accountSelectDisabled={!lookupsReady || mutation.pending || mutation.blocked || !!action}
            onReloadAccounts={onReloadAccounts}
            onUnlink={() => setAction("unlink")}
          />
        </fieldset>
        {mutation.blocked && (
          <EmployeeConflictPanel
            repository={repository}
            mutation={mutation}
            baseline={baseline}
            searchName={values.fullName}
            latest={latest}
            reconciledRows={reconciledRows}
            onLatestLoaded={setLatest}
            onRowsLoaded={setReconciledRows}
            onCompared={setCompared}
            onKeepDraft={(reviewed) => {
              setBaseline(reviewed);
              setLatest(undefined);
              mutation.reviewed();
            }}
            onAdopt={onAdopt}
          />
        )}
        {discard && (
          <div className="my-4 rounded-control border border-border p-4">
            <p>Bỏ các thay đổi chưa lưu?</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button className="w-auto" variant="secondary" onClick={() => setDiscard(false)}>
                Tiếp tục sửa
              </Button>
              <Button className="w-auto" onClick={onClose}>
                Bỏ bản nháp
              </Button>
            </div>
          </div>
        )}
        <div className={styles.actions}>
          <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>
            Đóng hồ sơ
          </Button>
          {dirty && (
            <Button
              className="w-auto"
              variant="secondary"
              disabled={mutation.pending || mutation.blocked}
              onClick={() => {
                setValues(valuesOf(baseline));
                setIssues([]);
              }}
            >
              Hủy thay đổi
            </Button>
          )}
          <Button
            className="w-auto"
            type="submit"
            isPending={mutation.pending}
            disabled={mutation.blocked || !lookupsReady || (!!baseline && !dirty)}
          >
            Lưu hồ sơ
          </Button>
        </div>
      </form>
      {action && baseline && (
        <EmployeeStatusActionDialog
          action={action}
          baseline={baseline}
          pending={mutation.pending}
          busy={() => mutation.busy()}
          endDate={endDate}
          actionError={actionError}
          onEndDateChange={(value) => {
            setEndDate(value);
            setActionError(undefined);
          }}
          onCancel={() => setAction(undefined)}
          onConfirm={() => void confirmAction()}
        />
      )}
    </Dialog>
  );
}
