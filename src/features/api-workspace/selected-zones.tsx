"use client";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { loadInUseZones } from "@/features/zones-api/in-use-zones";
import { useRemote } from "@/features/operations/ui";
import {
  readStoredZoneSelection, resolveZoneSelection, toggleZoneSelection, writeStoredZoneSelection, zoneSelectionLabel,
  type StoredZoneSelection, type ZoneOption,
} from "./selected-zones-model";

export type SelectedZones = Readonly<{
  status: "idle" | "loading" | "ready" | "error";
  zones: readonly ZoneOption[];
  selectedIds: readonly string[];
  allSelected: boolean;
  label: string;
  selectAll(): void;
  /** Narrows the header to exactly this zone (a screen filter that picks one zone writes it here, so header and screen never disagree). */
  selectOnly(zoneId: string): void;
  /** Narrows the header to these zones (a report link `?zones=a,b`); unknown ids are dropped, none left or every zone = all. */
  selectMany(zoneIds: readonly string[]): void;
  toggle(zoneId: string): void;
  reload(): void;
}>;

const noop = () => {};
// Outside the provider (mock runtime, isolated screens) nothing is narrowed.
const unscoped: SelectedZones = { status: "idle", zones: [], selectedIds: [], allSelected: true, label: "Tất cả vùng nuôi", selectAll: noop, selectOnly: noop, selectMany: noop, toggle: noop, reload: noop };
const SelectedZonesContext = createContext<SelectedZones>(unscoped);

/** The In Use zones the signed-in account may see and the subset chosen in the header; the choice is remembered per browser. */
export function SelectedZonesProvider({ accountId, enabled, children }: Readonly<{ accountId: string; enabled: boolean; children: ReactNode }>) {
  const loader = useCallback(async (signal: AbortSignal) => {
    if (!enabled) return { status: "success" as const, data: [] };
    return loadInUseZones(signal);
  }, [enabled]);
  const remote = useRemote(loader);
  const [override, setOverride] = useState<StoredZoneSelection>();
  const zones = useMemo<readonly ZoneOption[]>(() => remote.data?.map((row) => ({ id: row.id, name: String(row.name ?? row.code ?? ""), ...(row.code ? { code: String(row.code) } : {}) })) ?? [], [remote.data]);
  const persisted = useMemo(() => remote.data ? readStoredZoneSelection(accountId) : undefined, [remote.data, accountId]);
  const stored = override ?? persisted;
  const selection = useMemo(() => resolveZoneSelection(zones, stored), [zones, stored]);
  const value = useMemo<SelectedZones>(() => {
    const save = (next: StoredZoneSelection) => { setOverride(next); writeStoredZoneSelection(accountId, next); };
    return {
      status: !enabled ? "idle" : remote.error ? "error" : remote.data ? "ready" : "loading",
      zones, ...selection, label: zoneSelectionLabel(zones, selection),
      selectAll: () => save({ kind: "all" }),
      selectMany: (zoneIds) => { const ids = zones.map(zone => zone.id).filter(id => zoneIds.includes(id)); save(!ids.length || ids.length === zones.length ? { kind: "all" } : { kind: "ids", ids }); },
      // A zone the header does not list (discontinued, or not visible) is ignored; one zone out of one is "all".
      selectOnly: (zoneId) => { if (zones.some(zone => zone.id === zoneId)) save(zones.length === 1 ? { kind: "all" } : { kind: "ids", ids: [zoneId] }); },
      toggle: (zoneId) => save(toggleZoneSelection(zones, selection, zoneId)),
      reload: remote.reload,
    };
  }, [accountId, enabled, remote.data, remote.error, remote.reload, zones, selection]);
  return <SelectedZonesContext.Provider value={value}>{children}</SelectedZonesContext.Provider>;
}

export function useSelectedZones(): SelectedZones {
  return useContext(SelectedZonesContext);
}

/**
 * Narrows a screen's own zone choices to the header selection and resolves which zone the screen should show.
 * `options` are the zones the screen already offers; `choice` is the screen's own pick (may be empty); `keepId` stays
 * offered even if it is not selected (for example a deep link). Without a narrowing selection nothing changes, so screens
 * keep their previous behaviour while zones load, when loading fails, or when every zone is chosen.
 */
export function useScopedZones<T extends { id: string }>(options: readonly T[], choice: string, keepId?: string): Readonly<{ zones: T[]; zoneId: string; narrowed: boolean }> {
  const { status, allSelected, selectedIds } = useSelectedZones();
  const narrowed = status === "ready" && !allSelected;
  if (!narrowed) return { zones: [...options], zoneId: choice, narrowed };
  const kept = options.filter((option) => selectedIds.includes(option.id) || option.id === keepId);
  const zones = kept.length ? kept : [...options];
  return { zones, zoneId: choice && zones.some((option) => option.id === choice) ? choice : zones[0]?.id ?? "", narrowed };
}
