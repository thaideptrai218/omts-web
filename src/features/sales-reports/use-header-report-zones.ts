"use client";
import { useCallback, useEffect, useRef } from "react";
import { useSelectedZones, type SelectedZones } from "@/features/api-workspace/selected-zones";

const NONE: readonly string[] = [];

/**
 * Writes a zone list picked in a report rail back to the header. The rail changes one zone at a time (add a pill, drop a pill, pick the first zone,
 * clear the last pill), which the header takes as toggle / selectAll; a list that differs by several zones at once (a `?zones=a,b` link) is set
 * whole with selectMany.
 */
export function applyHeaderZones(header: SelectedZones, next: readonly string[]) {
  const current = header.allSelected ? NONE : header.selectedIds;
  if (!next.length) return header.selectAll();
  const added = next.filter((id) => !current.includes(id)), removed = current.filter((id) => !next.includes(id));
  if (current.length && added.length + removed.length === 1) return header.toggle(added[0] ?? removed[0]);
  header.selectMany(next);
}

/**
 * The zones of a report are the zones chosen in the header (the header chip is the one source): `zoneIds` is empty while every zone is chosen,
 * and `setZoneIds` narrows or widens the header. A link that names zones (`?zones=a,b`, passed as `linked`) narrows the header once, when its zone list is ready.
 */
export function useHeaderReportZones(linked: readonly string[]) {
  const header = useSelectedZones(), followed = useRef(false);
  const zoneIds = header.status === "ready" && !header.allSelected ? header.selectedIds : NONE;
  useEffect(() => {
    if (followed.current || header.status !== "ready") return;
    followed.current = true;
    const wanted = linked.filter((id) => header.zones.some((zone) => zone.id === id));
    if (wanted.length) applyHeaderZones(header, wanted);
  }, [header, linked]);
  const setZoneIds = useCallback((next: readonly string[]) => applyHeaderZones(header, next), [header]);
  return { zoneIds, setZoneIds };
}
