"use client";
import { useCallback, useMemo } from "react";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import type { LinkedEmployee } from "@/features/account-access/user-info-section";
import { employeePageSchema } from "@/features/employee-management/api/employee-contract.schemas";
import { createOperationsRepository } from "@/features/operations/repository";
import { useRemote } from "@/features/operations/ui";

const MAX_PAGES = 20;

/** Every employee (working and left) as id, name and kind, so the account list can name the person behind each login. */
async function loadLinkedEmployees(signal: AbortSignal): Promise<WorkspaceResult<LinkedEmployee[]>> {
  const repository = createOperationsRepository("employees"), found: LinkedEmployee[] = [];
  for (const statusId of ["401", "402"]) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await repository.read("list", { statusId, page: String(page), pageSize: "100" }, employeePageSchema, signal);
      if (result.status !== "success") return result;
      found.push(...result.data.items.map((row) => ({ id: row.id, name: row.fullName, type: row.employeeType, zoneIds: row.workingZones.map((zone) => zone.id) })));
      if (page * 100 >= result.data.total || !result.data.items.length) break;
    }
  }
  return { status: "success", data: found };
}

/** Employee names by id; a failed read just leaves the generic "Nhân viên đã gắn" text, it never hides the accounts. */
export function useLinkedEmployees(enabled: boolean) {
  const remote = useRemote(useCallback((signal: AbortSignal) => enabled ? loadLinkedEmployees(signal) : Promise.resolve({ status: "success" as const, data: [] as LinkedEmployee[] }), [enabled]));
  const byId = useMemo(() => new Map((remote.data ?? []).map((employee) => [employee.id, employee])), [remote.data]);
  return { byId, refresh: remote.refresh };
}
