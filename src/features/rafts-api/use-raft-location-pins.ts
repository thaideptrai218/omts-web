"use client";
import { useCallback } from "react";
import type { ContextPin } from "@/features/farming-api/location-picker-model";
import { pinsOf } from "@/features/farming-api/location-picker-model";
import { useRemote } from "@/features/operations/ui";
import { readZoneDetail } from "@/features/zones-api/zone-model";
import { readZoneRafts } from "./raft-model";

/**
 * Orientation pins for placing a raft: its zone and the zone's other rafts that already have coordinates.
 * Either read may be refused or fail; the picker then simply works with the pins that did load.
 */
export function useRaftLocationPins(zoneId: string, selfId?: string): { pins: ContextPin[]; loading: boolean } {
  const zone = useRemote(useCallback((signal: AbortSignal) => readZoneDetail(zoneId, signal), [zoneId]));
  const rafts = useRemote(useCallback((signal: AbortSignal) => readZoneRafts(zoneId, signal), [zoneId]));
  const zonePins = zone.data ? pinsOf("zone", [zone.data], undefined) : [];
  return { pins: [...zonePins, ...pinsOf("raft", rafts.data ?? [], selfId)], loading: zone.loading || rafts.loading };
}
