"use client";
import { useCallback, useMemo } from "react";
import { loadOptions } from "@/features/operations/lookups";
import { useRemote } from "@/features/operations/ui";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { toUserAccount, type UserAccount } from "./user-account-model";

export type UserZone = { id: string; name: string };
export type EmployeeLookup = { id: string; code: string; fullName: string; phoneNumber: string; workingZoneIds: string[]; employed: boolean; hasAccount: boolean };
const toEmployee = (record: ApiRecord): EmployeeLookup => ({
  id: record.id, code: typeof record.code === "string" ? record.code : "", fullName: typeof record.fullName === "string" ? record.fullName : "",
  phoneNumber: typeof record.phoneNumber === "string" ? record.phoneNumber : "", employed: record.status === "Employed", hasAccount: record.account != null,
  workingZoneIds: Array.isArray(record.workingZones) ? (record.workingZones as { id: string }[]).map((zone) => zone.id) : [],
});

/**
 * Loads every staff account and the zone and employee catalogues once per screen.
 * Why no per-row grant request: the backend list already carries each account's Effective zone-role pairs and linked
 * employee id, so role, zone and employee columns cost nothing extra. Names of employees and zones come from their own lists.
 * A failed employee or zone read never hides the accounts; those cells then show a dash.
 */
export function useUserAccounts() {
  const accountsRemote = useRemote(useCallback((signal: AbortSignal) => loadOptions("accounts", signal), []));
  const employeesRemote = useRemote(useCallback((signal: AbortSignal) => loadOptions("employees", signal), []));
  const zonesRemote = useRemote(useCallback((signal: AbortSignal) => loadOptions("zones", signal), []));
  const accounts = useMemo<UserAccount[] | undefined>(() => accountsRemote.data?.map(toUserAccount), [accountsRemote.data]);
  const employees = useMemo(() => new Map((employeesRemote.data ?? []).map((record) => [record.id, toEmployee(record)])), [employeesRemote.data]);
  const zones = useMemo(() => (zonesRemote.data ?? []).filter((zone) => zone.statusId === 101).map((zone) => ({ id: zone.id, name: String(zone.name ?? zone.code ?? "") })), [zonesRemote.data]);
  return {
    accounts, loading: accountsRemote.loading, error: accountsRemote.error, employees, zones,
    /** Visible reload (after an error). */
    reload: () => { accountsRemote.reload(); employeesRemote.reload(); },
    /** Silent refresh after a write: the table keeps its rows while the new ones arrive. */
    refresh: () => { accountsRemote.refresh(); employeesRemote.refresh(); },
  };
}
