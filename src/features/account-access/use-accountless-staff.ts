"use client";
import { useCallback } from "react";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { employeePageSchema, type EmployeeListItemDto } from "@/features/employee-management/api/employee-contract.schemas";
import { createOperationsRepository } from "@/features/operations/repository";
import { useRemote } from "@/features/operations/ui";

export type PickableEmployee = Pick<EmployeeListItemDto, "id" | "code" | "fullName" | "phoneNumber" | "employeeType">;
const EMPLOYED = "401", MAX_PAGES = 20;

/**
 * Employees an account may be given to: official (nội bộ, `Staff`) staff who still work here and hold no account yet.
 * Seasonal workers are never offered, whatever the backend would accept. Reads every page once (100 at a time).
 */
export async function loadAccountlessStaff(signal: AbortSignal): Promise<WorkspaceResult<PickableEmployee[]>> {
  const repository = createOperationsRepository("employees"), found: PickableEmployee[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await repository.read("list", { statusId: EMPLOYED, employeeType: "Staff", page: String(page), pageSize: "100" }, employeePageSchema, signal);
    if (result.status !== "success") return result;
    found.push(...result.data.items.filter((row) => !row.account && row.employeeType === "Staff"));
    if (page * 100 >= result.data.total || !result.data.items.length) return { status: "success", data: found };
  }
  return { status: "success", data: found };
}

/** Loads the pickable employees only while `enabled` (a dialog that already has its employee reads nothing). */
export function useAccountlessStaff(enabled: boolean) {
  return useRemote(useCallback((signal: AbortSignal) => enabled ? loadAccountlessStaff(signal) : Promise.resolve({ status: "success" as const, data: [] as PickableEmployee[] }), [enabled]));
}
