"use client";
import { useState } from "react";
import { FilterGroup } from "@/components/ui/management-screen/management-layout";
import { SelectBox } from "@/components/ui/select-box";
import { ALL_ZONES, type ZoneFilter } from "@/features/api-workspace/zone-filter";
import { zoneOptionLabel } from "./use-zone-choice";
import type { ZoneRow } from "@/features/zones-api/zone-model";

/**
 * A link may name a discontinued zone, which the header never lists. While the header selection is still what it was when the screen opened,
 * that zone alone is shown (read-only); any change of the header selection, or a pick in the rail, releases it for good.
 * `candidateId` is the discontinued zone the link named, if any.
 */
export function usePinnedZone(filter: ZoneFilter, candidateId: string | undefined) {
  const [opened, setOpened] = useState<{ ids: string | undefined }>(), [released, setReleased] = useState(false);
  if (!opened && filter.ready) setOpened({ ids: filter.apiZoneIds });
  else if (opened && !released && opened.ids !== filter.apiZoneIds) setReleased(true);
  return { pinnedId: released ? undefined : candidateId, release: () => setReleased(true) };
}

/** The rail filter of a screen that opened on a discontinued zone: that zone, "all zones" and every header zone; any pick leaves the read-only view and writes the header. */
export function PinnedZoneField({ zone, filter, legend = "Vùng nuôi", className, beforeChange, onRelease }: {
  zone: ZoneRow; filter: ZoneFilter; legend?: string; className?: string; beforeChange?(apply: () => void): void; onRelease(): void;
}) {
  const pick = (value: string) => { if (value === zone.id) return; (beforeChange ?? (apply => apply()))(() => { onRelease(); filter.set(value); }); };
  return <FilterGroup legend={legend}>
    <SelectBox aria-label={legend} className={className ?? "omts-control"} value={zone.id} onChange={event => pick(event.target.value)}>
      <option value={zone.id}>{zoneOptionLabel(zone)}</option><option value={ALL_ZONES}>Tất cả vùng nuôi</option>
      {filter.zones.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </SelectBox>
  </FilterGroup>;
}

/**
 * True once the header selection has taken the zone a link named (`useZoneFilter` does that right after the screen opens), so a list never opens on the old
 * selection first and then jumps. It waits for the header list to load; a zone the header does not list (discontinued) never waits. A newly named zone waits again; afterwards the user may change the header freely.
 */
export function useLinkedZoneSettled(filter: ZoneFilter, wantedId: string | null | undefined): boolean {
  const key = wantedId ?? "", [settledFor, setSettledFor] = useState<string>();
  const waiting = !!wantedId && (!filter.ready || filter.zones.some(zone => zone.id === wantedId) && filter.singleZoneId !== wantedId);
  if (settledFor !== key && !waiting) setSettledFor(key);
  return settledFor === key;
}
