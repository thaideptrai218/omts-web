"use client";
import { useRemote } from "@/features/operations/ui";
import { pinsOf } from "./location-picker-model";
import { readZoneMap } from "./zone-map-repository";

const load = (signal: AbortSignal) => readZoneMap(false, signal);
/** Match the existing map's first real cooperative point; this is a viewport, never a selected location. */
export function useLocationDefault() {
  const remote = useRemote(load);
  const rows = remote.data ?? [];
  return { center: pinsOf("zone", rows)[0] ?? pinsOf("raft", rows.flatMap(zone => zone.rafts))[0], loading: remote.loading };
}
