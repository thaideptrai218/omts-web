"use client";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";

/**
 * Creating, reloading, finalizing, cancelling and paying a payroll sheet are the Cooperative Owner's alone (the backend answers 403 to anyone else).
 * The Accountant only reads and exports, so the write buttons are not shown to them.
 */
export function usePayrollWriter(): boolean {
  return useApiWorkspace().identity.subjectType === "CooperativeOwner";
}
