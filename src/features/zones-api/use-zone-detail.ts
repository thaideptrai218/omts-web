"use client";
import { useCallback } from "react";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import { readZoneDetail } from "./zone-model";

/** Loads one zone. A reload keeps the last record on screen, so an open in-place editor and its draft survive it. */
export function useZoneDetail(id: string) {
  return useStickyRemote(useCallback((signal: AbortSignal) => readZoneDetail(id, signal), [id]));
}
