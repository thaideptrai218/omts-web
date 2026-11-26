"use client";
import type { ContextPin } from "@/features/farming-api/location-picker-model";
import { pinsOf } from "@/features/farming-api/location-picker-model";
import type { ZoneBoundary } from "@/features/farming-api/zone-map-contract";
import { readZoneMap } from "@/features/farming-api/zone-map-repository";
import { useRemote } from "@/features/operations/ui";

const loadMap = (signal: AbortSignal) => readZoneMap(false, signal);

/**
 * Orientation for placing a raft, from one map read: the pins of its zone and of the zone's other rafts that already have coordinates,
 * and the zone boundary the picker draws. The read may be refused or fail; the picker then simply works without them.
 */
export function useRaftLocationPins(zoneId: string, selfId?: string): { pins: ContextPin[]; boundary: ZoneBoundary | null; loading: boolean } {
  const map = useRemote(loadMap);
  const zone = map.data?.find(row => row.id === zoneId);
  return { pins: zone ? [...pinsOf("zone", [zone]), ...pinsOf("raft", zone.rafts, selfId)] : [], boundary: zone?.boundary ?? null, loading: map.loading };
}
