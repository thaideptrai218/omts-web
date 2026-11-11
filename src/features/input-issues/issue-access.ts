"use client";
import { useCallback } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { loadOptions } from "@/features/operations/lookups";
import { useRemote } from "@/features/operations/ui";
import { inputRepository, issueRepository } from "@/features/input-items/repository";
import type { IssueKind, IssueType } from "@/features/input-items/contracts";

/** What differs between the two documents that share one entity: where they live, how they are called and which function guards them. */
export const kindInfo = {
  Use: { path: "/inputs/uses", title: "Xuất dùng", codeLabel: "Mã xuất dùng", noun: "phiếu xuất dùng", icon: "document" as const },
  Disposal: { path: "/inputs/disposals", title: "Xuất hủy", codeLabel: "Mã xuất hủy", noun: "phiếu xuất hủy", icon: "trash" as const },
} as const;
export const itemHref = (code: string) => `/inputs/items?code=${encodeURIComponent(code)}`;

/**
 * Use issues follow the zone-scoped function `INPUT_ISSUES`. Disposals have a function of their own to read and export, and only the
 * Owner records, edits or cancels them.
 */
export function useIssueAccess(kind: IssueKind) {
  const { identity, permissions } = useApiWorkspace();
  const owner = identity.subjectType === "CooperativeOwner";
  const can = (fn: string, action: string) => owner || permissions.functionPermissions.some((p) => p.functionCode === fn && p.action === action);
  const use = kind === "Use";
  return {
    owner, username: identity.username, can,
    view: use ? can("INPUT_ISSUES", "View") : can("INPUT_DISPOSALS", "View"),
    create: use ? can("INPUT_ISSUES", "Create") : owner,
    edit: use ? can("INPUT_ISSUES", "Edit") : owner,
    remove: use ? can("INPUT_ISSUES", "Delete") : owner,
    exportFile: use ? can("INPUT_ISSUES", "Export") : can("INPUT_DISPOSALS", "Export"),
  };
}
export type IssueAccess = ReturnType<typeof useIssueAccess>;

export type ZoneOption = { id: string; code: string; name: string; inUse: boolean };
/** The zones the account can see, for the filter and the zone of a use issue. */
export function useZoneOptions(enabled = true) {
  const remote = useRemote<ZoneOption[]>(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<ZoneOption[]>> => {
    if (!enabled) return { status: "success", data: [] };
    const result = await loadOptions("zones", signal);
    return result.status === "success"
      ? { status: "success", data: result.data.map((row): ZoneOption => ({ id: row.id, code: String(row.code ?? ""), name: String(row.name ?? ""), inUse: row.statusId === 101 })) }
      : result;
  }, [enabled]));
  return { zones: remote.data ?? [], loading: remote.loading, error: remote.error };
}

export function useIssueTypes(enabled = true) {
  const remote = useRemote<IssueType[]>(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<IssueType[]>> => enabled ? inputRepository.issueTypes(signal) : { status: "success", data: [] }, [enabled]));
  return { types: remote.data ?? [], loading: remote.loading, error: remote.error, reload: remote.reload };
}

export type ReceiverOption = { id: string; fullName: string };
/** The employees who work in the zone and may receive what is issued there; empty until a zone is chosen. */
export function useReceivers(zoneId: string) {
  const remote = useRemote<ReceiverOption[]>(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<ReceiverOption[]>> => zoneId ? issueRepository.receivers(zoneId, signal) : { status: "success", data: [] }, [zoneId]));
  return { receivers: remote.data ?? [], loading: remote.loading, error: remote.error };
}
