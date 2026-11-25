"use client";
import { useCallback, useMemo } from "react";
import { loadOptions } from "@/features/operations/lookups";
import { useRemote } from "@/features/operations/ui";
import type { ApiRecord, WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { toUserAccount, type UserAccount } from "./user-account-model";

export type UserZone = { id: string; name: string };
const none: WorkspaceResult<ApiRecord[]> = { status: "success", data: [] };

/**
 * Loads every staff account (with its Effective zone-role pairs and linked employee id, so no per-row grant request) and the
 * zone catalogue once. The accounts list is for the Owner only; with `enabled` false nothing is requested and the result is empty.
 * A failed zone read never hides the accounts.
 */
export function useUserAccounts(enabled = true) {
  const accountsRemote = useRemote(useCallback((signal: AbortSignal) => enabled ? loadOptions("accounts", signal) : Promise.resolve(none), [enabled]));
  const zonesRemote = useRemote(useCallback((signal: AbortSignal) => enabled ? loadOptions("zones", signal) : Promise.resolve(none), [enabled]));
  const accounts = useMemo<UserAccount[] | undefined>(() => accountsRemote.data?.map(toUserAccount), [accountsRemote.data]);
  const byId = useMemo(() => new Map((accounts ?? []).map((account) => [account.id, account])), [accounts]);
  const zones = useMemo<UserZone[]>(() => (zonesRemote.data ?? []).filter((zone) => zone.statusId === 101).map((zone) => ({ id: zone.id, name: String(zone.name ?? zone.code ?? "") })), [zonesRemote.data]);
  return {
    accounts, byId, zones, loading: accountsRemote.loading, error: accountsRemote.error,
    /** Visible reload (after an error). */
    reload: accountsRemote.reload,
    /** Silent refresh after a write: the list keeps its rows while the new ones arrive. */
    refresh: accountsRemote.refresh,
  };
}
