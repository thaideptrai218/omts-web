"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useScopedZones } from "@/features/api-workspace/selected-zones";
import { readInUseZones, type ZoneRow } from "@/features/zones-api/zone-model";
import { useStickyRemote } from "./use-sticky-remote";

/**
 * Zone choice of a screen whose backend lists data per zone: every In Use zone the account may use, narrowed by the header
 * selection, starting on the zone named by `?zoneId=` (a link from the zone screen) or else the first one.
 */
export function useZoneChoice(allowed?: (zone: ZoneRow) => boolean) {
  const params = useSearchParams(), linkedZone = params?.get("zoneId") ?? "";
  const [selection, setSelection] = useState({ linkedZone, choice: linkedZone });
  // Same-route links can change zone without remounting this hook.
  const choice = selection.linkedZone === linkedZone ? selection.choice : linkedZone;
  const setChoice = (next: string) => setSelection({ linkedZone, choice: next });
  const remote = useStickyRemote(readInUseZones);
  const scoped = useScopedZones((remote.data ?? []).filter(zone => !allowed || allowed(zone)), choice, linkedZone);
  // A link to a zone that is not offered (for example a discontinued one) opens the first offered zone instead.
  const offered = !remote.data || scoped.zones.some(zone => zone.id === scoped.zoneId);
  return { remote, zones: scoped.zones, zoneId: (offered && scoped.zoneId) || scoped.zones[0]?.id || "", setChoice };
}
