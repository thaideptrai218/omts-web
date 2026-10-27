"use client";

import { useEffect, useRef, useState, type BaseSyntheticEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { AccountFollowUp, EmployeeProfile } from "@/features/employee-management/domain/employee-management";
import type { EmployeeEditorValues } from "@/features/employee-management/schemas/employee-editor-schema";
import type { EmployeeManagementService } from "@/features/employee-management/services/employee-management-service";
import { createEmployeeMutationTracker } from "@/features/employee-management/state/employee-mutation";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";
import { bindEmployeeEditorProblem, type EmployeeEditorProblem } from "./employee-editor-problem";
import type { BindableEmployeeProblem } from "../domain/employee-problem";

type Feedback = Readonly<{
  existingEmployeeId?: string;
  text: string;
  tone: "danger" | "success";
}>;

type Options = Readonly<{
  employee?: EmployeeProfile;
  form: UseFormReturn<EmployeeEditorValues>;
  service: Pick<EmployeeManagementService, "save" | "unlinkAccount">;
  onPendingChange(pending: boolean): void;
  onSaved(employee: EmployeeProfile, followUp?: AccountFollowUp): void;
  onUnlinked(employee: EmployeeProfile): void;
}>;

export function useEmployeeEditorActions({
  employee, form, service, onPendingChange, onSaved, onUnlinked,
}: Options) {
  const [feedback, setFeedback] = useState<Feedback>();
  const [pending, setPending] = useState<"save" | "unlink" | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [mutations] = useState(createEmployeeMutationTracker);
  const version = useRef(employee?.recordVersion ?? null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const requestedFocus = useRef<{
    operation?: NonNullable<ReturnType<typeof mutations.start>>;
    field?: EmployeeEditorProblem["fieldErrors"][number]["field"];
  } | undefined>(undefined);

  useEffect(() => () => {
    requestedFocus.current = undefined;
    mutations.invalidate();
  }, [mutations]);

  useEffect(() => {
    const focus = requestedFocus.current;
    if (!focus || pending !== null || confirmUnlink) return;
    // Schedule after commit and the child dialog's close effect. Never race a
    // newly rendered summary against the old confirmation's focus restoration.
    const frame = requestAnimationFrame(() => {
      if (requestedFocus.current !== focus || (focus.operation && !focus.operation.isCurrent())) return;
      if (focus.field) form.setFocus(focus.field);
      else feedbackRef.current?.focus();
      requestedFocus.current = undefined;
    });
    return () => cancelAnimationFrame(frame);
  }, [feedback, pending, confirmUnlink, form]);

  function start(action: "save" | "unlink") {
    const operation = mutations.start();
    if (!operation) return null;
    requestedFocus.current = undefined;
    setFeedback(undefined);
    setPending(action);
    onPendingChange(true);
    return operation;
  }

  function finish(operation: NonNullable<ReturnType<typeof start>>) {
    if (!operation.finish()) return;
    setPending(null);
    onPendingChange(false);
  }

  function changeUnlinkConfirmation(open: boolean) {
    requestedFocus.current = open ? undefined : { field: "accountId" };
    setConfirmUnlink(open);
    // The effect restores focus after commit, pending completion and native close.
  }

  function showProblem(problem: BindableEmployeeProblem, operation: NonNullable<ReturnType<typeof start>>) {
    const binding = bindEmployeeEditorProblem(problem);
    requestedFocus.current = { operation, field: binding.fieldErrors[0]?.field };
    for (const error of binding.fieldErrors) form.setError(error.field, { type: "server", message: error.message });
    setFeedback({ text: binding.summary, existingEmployeeId: binding.existingEmployeeId, tone: "danger" });
  }

  async function persistEmployee(values: EmployeeEditorValues) {
    if (confirmUnlink) return;
    const operation = start("save");
    if (!operation) return;
    try {
      const result = await service.save({
        ...values,
        accountId: values.accountId || null,
        id: employee?.id ?? null,
        recordVersion: version.current,
      });
      if (!operation.isCurrent()) return;
      if (result.status === "invalid-fields" || (result.status === "duplicate" && "code" in result)) {
        showProblem(result, operation);
      } else if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
      } else if (result.status === "forbidden" || result.status === "conflict") {
        setFeedback({ text: formatMessage(result.message), tone: "danger" });
      } else if (result.status === "saved") {
        onSaved(result.employee, result.followUp);
      } else {
        const field = result.status === "invalid-input"
          ? result.field
          : result.status === "duplicate" ? "fullName" : "accountId";
        form.setError(field, { message: formatMessage(result.message) });
        if (result.status !== "invalid-input") {
          setFeedback({
            existingEmployeeId: result.existingEmployeeId,
            text: formatMessage(result.message), tone: "danger",
          });
        }
        requestAnimationFrame(() => {
          if (operation.isCurrent()) form.setFocus(field);
        });
      }
    } catch {
      if (operation.isCurrent()) setFeedback({
        text: "Chưa xác nhận được kết quả lưu. Vui lòng tải lại trang để kiểm tra trước khi thử lại.",
        tone: "danger",
      });
    } finally {
      finish(operation);
    }
  }

  function saveEmployee(event: BaseSyntheticEvent) {
    return form.handleSubmit(persistEmployee)(event);
  }

  async function unlinkAccount() {
    if (!employee?.account || !version.current) return;
    const operation = start("unlink");
    if (!operation) return;
    try {
      const result = await service.unlinkAccount({
        employeeId: employee.id, recordVersion: version.current,
      });
      if (!operation.isCurrent()) return;
      if (result.status === "invalid-fields") setConfirmUnlink(false);
      else changeUnlinkConfirmation(false);
      if (result.status === "invalid-fields") {
        showProblem(result, operation);
      } else if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
      } else if (result.status === "not-found") {
        setFeedback({ text: "Không tìm thấy hồ sơ nhân viên. Vui lòng tải lại danh sách.", tone: "danger" });
      } else if (result.status !== "unlinked") {
        setFeedback({ text: formatMessage(result.message), tone: "danger" });
      } else {
        // Only the account field gets a new baseline. Other dirty fields stay intact.
        const selectedAccount = form.getValues("accountId");
        version.current = result.employee.recordVersion;
        form.resetField("accountId", { defaultValue: "" });
        if (selectedAccount && selectedAccount !== employee.account.id) {
          form.setValue("accountId", selectedAccount, { shouldDirty: true });
        }
        onUnlinked(result.employee);
      }
    } catch {
      if (operation.isCurrent()) {
        changeUnlinkConfirmation(false);
        setFeedback({
          text: "Chưa xác nhận được kết quả bỏ liên kết. Vui lòng tải lại trang để kiểm tra trước khi thử lại.",
          tone: "danger",
        });
      }
    } finally {
      finish(operation);
    }
  }

  return { feedback, feedbackRef, pending, confirmUnlink, setConfirmUnlink: changeUnlinkConfirmation, saveEmployee, unlinkAccount };
}
