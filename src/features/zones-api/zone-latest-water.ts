"use client";
import { useCallback } from "react";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import { createOperationsRepository } from "@/features/operations/repository";
import { zoneOverviewSchema, type ZoneOverviewItem } from "@/features/water-overview/contracts";
import { skipped } from "./zone-summary-reads";

const water = createOperationsRepository("water");
/** Newest measurement and alert of every zone from the water overview (one read for all zones); nothing is read until `enabled`. */
export function useZoneLatestWater(enabled: boolean) {
  const remote = useStickyRemote(useCallback((signal: AbortSignal) => enabled ? water.read("zones-overview", {}, zoneOverviewSchema, signal) : skipped<ZoneOverviewItem[]>([]), [enabled]));
  const byZone = new Map((remote.data ?? []).map(item => [item.zoneId, item] as const));
  return { byZone: enabled && remote.data ? byZone : undefined, loading: enabled && remote.loading, error: enabled ? remote.error : undefined };
}
