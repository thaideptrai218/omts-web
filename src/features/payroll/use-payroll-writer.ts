"use client";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";

/**
 * Preparing a payroll sheet (create, reload) and paying wages (sheet payments, standalone payments and advances, voucher edit and cancel) are done by the
 * Cooperative Owner and by a Staff account holding PAYROLL Create and Edit (the Accountant). The backend answers 403 to anyone else.
 */
export function usePayrollWriter(): boolean {
  const { identity, permissions } = useApiWorkspace();
  if (identity.subjectType === "CooperativeOwner") return true;
  if (identity.subjectType !== "Staff") return false;
  const holds = (action: string) => permissions.functionPermissions.some((p) => p.functionCode === "PAYROLL" && p.action === action);
  return holds("Create") && holds("Edit");
}

/** Finalizing and cancelling a sheet and the bonus and deduction lines of a payslip are the Cooperative Owner's alone, by a fixed rule on the account. */
export function usePayrollOwner(): boolean {
  return useApiWorkspace().identity.subjectType === "CooperativeOwner";
}
