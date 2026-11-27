"use client";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { SelectBox } from "@/components/ui/select-box";
import { FilterGroup } from "@/components/ui/management-screen/management-layout";
import { useSelectedZones } from "./selected-zones";
import type { ZoneOption } from "./selected-zones-model";

/** Select value for "every zone of the header" and for "a subset of several zones chosen in the header". */
export const ALL_ZONES = "", SEVERAL_ZONES = "__several";

export type ZoneFilter = Readonly<{
  /** The header list is loaded (before that a screen keeps its own default and sends no zone filter). */
  ready: boolean;
  /** Every zone the header lists (In Use zones the account may see). */
  zones: readonly ZoneOption[];
  /** The zones the header has chosen; every zone when `allSelected`. */
  selectedIds: readonly string[];
  allSelected: boolean;
  /** The one chosen zone, when exactly one is chosen (single-zone filters such as Bè need it). */
  singleZoneId: string | undefined;
  /** What a list request sends as `zoneIds` (comma separated); undefined = every zone the account may read. */
  apiZoneIds: string | undefined;
  /** Value of the rail select: ALL_ZONES, SEVERAL_ZONES or one zone id. */
  value: string;
  /** Writes the screen's choice back to the header: ALL_ZONES → every zone, a zone id → only that zone. */
  set(value: string): void;
}>;

/**
 * The zone filter of a list screen, kept in the header selection so the header chip and the rail always say the same thing (two-way).
 * A link that names a zone (`?zoneId=`) narrows the header to that zone once when the screen opens; a zone the header does not list
 * (for example a discontinued one) is left to the screen's own read-only handling.
 */
export function useZoneFilter({ followLink = true }: { followLink?: boolean } = {}): ZoneFilter {
  const header = useSelectedZones(), params = useSearchParams(), linked = followLink ? params?.get("zoneId") ?? "" : "";
  const applied = useRef("");
  useEffect(() => {
    if (!linked || applied.current === linked || header.status !== "ready") return;
    applied.current = linked;
    if (!(header.selectedIds.length === 1 && header.selectedIds[0] === linked)) header.selectOnly(linked);
  }, [linked, header]);
  const ready = header.status === "ready" || header.status === "idle";
  const singleZoneId = header.selectedIds.length === 1 ? header.selectedIds[0] : undefined;
  const value = header.allSelected ? (header.zones.length === 1 ? header.zones[0].id : ALL_ZONES) : singleZoneId ?? SEVERAL_ZONES;
  return {
    ready, zones: header.zones, selectedIds: header.selectedIds, allSelected: header.allSelected, singleZoneId: singleZoneId ?? (header.zones.length === 1 ? header.zones[0].id : undefined),
    apiZoneIds: header.status === "ready" && !header.allSelected ? header.selectedIds.join(",") : undefined,
    value, set: next => { if (next === ALL_ZONES) header.selectAll(); else if (next !== SEVERAL_ZONES) header.selectOnly(next); },
  };
}

/**
 * The rail filter "Vùng nuôi" bound to the header: Tất cả vùng nuôi · (N vùng đã chọn, only while the header holds a subset) · each zone.
 * `beforeChange` lets a screen guard unsaved edits or reset paging before the header changes.
 */
export function ZoneFilterField({ filter, legend = "Vùng nuôi", className, beforeChange }: {
  filter: ZoneFilter; legend?: string; className?: string; beforeChange?(apply: () => void): void;
}) {
  if (filter.zones.length <= 1) return null;
  const change = (next: string) => (beforeChange ?? (apply => apply()))(() => filter.set(next));
  return <FilterGroup legend={legend}>
    <SelectBox aria-label={legend} className={className ?? "omts-control"} value={filter.value} onChange={event => change(event.target.value)}>
      <option value={ALL_ZONES}>Tất cả vùng nuôi</option>
      {filter.value === SEVERAL_ZONES && <option value={SEVERAL_ZONES}>{filter.selectedIds.length} vùng đã chọn</option>}
      {filter.zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
    </SelectBox>
  </FilterGroup>;
}
