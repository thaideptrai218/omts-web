"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useScopedZones } from "@/features/api-workspace/selected-zones";
import { DISCONTINUED, readInUseZones, type ZoneRow } from "@/features/zones-api/zone-model";
import { useLinkedZone } from "./use-linked-zone";
import { useStickyRemote } from "./use-sticky-remote";

/** Label of a zone option: the suffix appears only on the one discontinued zone a link brought in. */
export const zoneOptionLabel = (zone: Pick<ZoneRow, "code" | "name" | "statusId">) =>
  `${zone.code ? `${zone.code} · ` : ""}${zone.name}${zone.statusId === DISCONTINUED ? " (ngừng sử dụng)" : ""}`;

/**
 * Zone choice of a screen whose backend lists data per zone: every In Use zone the account may use, narrowed by the header
 * selection, starting on the zone named by `?zoneId=` (a link from another screen) or else the first one.
 * A link or linked record that names a discontinued zone still opens THAT zone: it is added as one extra, read-only option
 * (`readOnly` is true while it is the chosen zone). Choices made by hand are In Use zones only.
 */
export function useZoneChoice(allowed?: (zone: ZoneRow) => boolean) {
  const params = useSearchParams(), linkedZone = params?.get("zoneId") ?? "";
  const [selection, setSelection] = useState({ linkedZone, choice: linkedZone });
  // Same-route links can change zone without remounting this hook.
  const choice = selection.linkedZone === linkedZone ? selection.choice : linkedZone;
  const setChoice = (next: string) => setSelection({ linkedZone, choice: next });
  const remote = useStickyRemote(readInUseZones);
  const inUse = (remote.data ?? []).filter(zone => !allowed || allowed(zone));
  const scoped = useScopedZones(inUse, choice, linkedZone);
  // The chosen zone is not an In Use one the account may use: it may be a discontinued zone named by a link.
  const { zone: found, settled } = useLinkedZone(choice, id => !remote.data || inUse.some(zone => zone.id === id));
  const linked = found && (!allowed || allowed(found)) ? found : undefined;
  const zones: ZoneRow[] = linked ? [...scoped.zones, linked] : scoped.zones;
  const offered = !remote.data || zones.some(zone => zone.id === scoped.zoneId) || linked?.id === choice;
  const zoneId = linked?.id === choice ? linked.id : (offered && scoped.zoneId) || zones[0]?.id || "";
  // Nothing is shown until the linked zone is read, so the screen never flashes another zone first.
  return { remote: { ...remote, data: settled ? remote.data : undefined }, zones, zoneId, setChoice, readOnly: linked?.id === zoneId };
}
