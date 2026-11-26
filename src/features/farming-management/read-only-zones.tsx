"use client";
import { createContext, useContext } from "react";

const ReadOnlyZones = createContext<ReadonlySet<string>>(new Set());
/** Zones that are open only through a link (discontinued): their records can be read but not created, edited or removed. */
export const ReadOnlyZonesProvider = ReadOnlyZones.Provider;

const READ_ACTIONS = new Set(["View", "LogsView", "Export"]);
/** Whether `action` is refused for `zoneId` because the zone is read-only; view and export actions are never refused. */
export function useZoneActionBlocked(zoneId: string): (action: string) => boolean {
  const zones = useContext(ReadOnlyZones);
  return action => zones.has(zoneId) && !READ_ACTIONS.has(action);
}
export const useZoneReadOnly = (zoneId: string) => useContext(ReadOnlyZones).has(zoneId);
