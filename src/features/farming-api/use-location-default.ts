"use client";
import { useCallback } from "react";
import { useRemote } from "@/features/operations/ui";
import { pinsOf } from "./location-picker-model";
import { readZoneMap } from "./zone-map-repository";
import type { MapZone } from "./zone-map-contract";

const load = (signal: AbortSignal) => readZoneMap(false, signal);
const none = (): Promise<{ status: "success"; data: MapZone[] }> => Promise.resolve({ status: "success", data: [] });
/**
 * Match the existing map's first real cooperative point; this is a viewport, never a selected location.
 * `enabled` is false when the caller already has a viewport (its own pins or centre), so the whole cooperative map is not read for nothing.
 */
export function useLocationDefault(enabled = true) {
  const remote = useRemote(useCallback((signal: AbortSignal) => enabled ? load(signal) : none(), [enabled]));
  const rows = remote.data ?? [];
  return { center: pinsOf("zone", rows)[0] ?? pinsOf("raft", rows.flatMap(zone => zone.rafts))[0], loading: remote.loading };
}
