"use client";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { businessToday, ErrorNotice } from "@/features/operations/ui";
import { EmployeeConflictPanel } from "./employee-conflict-panel";
import { EmployeeEditorFields } from "./employee-editor-fields";
import {
  fieldLabels,
  localFieldLabels,
  valuesOf,
} from "./employee-editor-model";
import { ProfileComparison } from "./employee-profile-comparison";
import styles from "./employee-screen.module.css";
import { EmployeeStatusActionDialog } from "./employee-status-action-dialog";

import { useEmployeeEditor, type EmployeeEditorProps } from "./use-employee-editor";
import { EmployeeTabs } from "./employee-tabs";
import { EmployeeEditorEmployment } from "./employee-editor-employment";

/** Employee profile and separate employment status changes. */
export function EmployeeApiEditor({
  record,
  zones,
  jobTypes,
  lookupsReady,
  onClose,
  onAdopt,
  onSaved,
}: EmployeeEditorProps) {
  const idPrefix = useId();
  const { repository, mutation, baseline, setBaseline, values, setValues, issues, setIssues, activeTab, setActiveTab, errorTabs, latest, setLatest, compared, setCompared, comparisonTarget, action, setAction, endDate, setEndDate, actionError, setActionError, discard, setDiscard, reconciledRows, setReconciledRows, formRef, dirty, zoneOptions, availableZones, close, problem, errorProps, save, confirmAction, openComparison } = useEmployeeEditor({record, zones, jobTypes, lookupsReady, onClose, onAdopt, onSaved});

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
        <EmployeeEditorEmployment baseline={baseline} dirty={dirty} disabled={!baseline.canMaintain || dirty || mutation.pending || mutation.blocked}
          onAction={() => { if (!dirty && !mutation.busy()) { setEndDate(businessToday()); setAction(baseline.status === "Employed" ? "end-employment" : "resume"); } }} />
      )}
      <form
        noValidate
        className={styles.editor}
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <EmployeeTabs idPrefix={idPrefix} active={activeTab} onChange={setActiveTab} errors={errorTabs} label="Nhóm thông tin hồ sơ nhân viên" />
        <fieldset disabled={(!!baseline && !baseline.canMaintain) || mutation.pending || mutation.blocked || !!action} className="space-y-4">
          <EmployeeEditorFields
            active={activeTab}
            idPrefix={idPrefix}
            values={values}
            setValues={setValues}
            errorProps={errorProps}
            baseline={baseline}
            availableZones={availableZones}
            zoneOptions={zoneOptions}
            jobTypes={jobTypes}
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
            disabled={mutation.blocked || !lookupsReady || (!!baseline && (!dirty || !baseline.canMaintain))}
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
