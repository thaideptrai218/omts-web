"use client";
import { useCallback } from "react";
import { DISCONTINUED, readZoneDetail, type ZoneDetail } from "@/features/zones-api/zone-model";
import { skipped } from "@/features/zones-api/zone-summary-reads";
import { useStickyRemote } from "./use-sticky-remote";

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A link or linked record may name a zone that is no longer offered because it is discontinued. When `wanted` is a zone id
 * that `isKnown` does not offer, it is read by id: `zone` is that zone when it is discontinued, so the screen can show it
 * as one extra read-only option instead of switching to another zone. `settled` is false until that read has answered.
 */
export function useLinkedZone(wanted: string, isKnown: (id: string) => boolean, enabled = true) {
  const missingId = enabled && GUID.test(wanted) && !isKnown(wanted) ? wanted : "";
  const remote = useStickyRemote(useCallback((signal: AbortSignal) => missingId ? readZoneDetail(missingId, signal) : skipped<ZoneDetail | undefined>(undefined), [missingId]));
  const settled = !missingId || remote.data?.id === missingId || (!!remote.error && !remote.loading);
  const zone = missingId && remote.data?.id === missingId && remote.data.statusId === DISCONTINUED ? remote.data : undefined;
  return { zone, settled };
}
