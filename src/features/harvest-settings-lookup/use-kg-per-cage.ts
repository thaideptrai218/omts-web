"use client";
import { useEffect, useMemo, useState } from "react";
import { harvestSettings } from "@/features/cultivation-api/records-contracts";
import { createOperationsRepository } from "@/features/operations/repository";
import { isUsableKgPerCage } from "@/shared/format/cage-quantity";

const repository = createOperationsRepository("harvest");

/**
 * Cooperative average kg per cage, read once through the existing harvest-settings BFF read.
 * Only Owners may read it; any failure (403, network, bad payload) yields `kgPerCage: undefined`
 * so callers show kg alone. Never throws.
 */
export function useKgPerCage(ownerAccountId?: string): { kgPerCage?: number; loading: boolean } {
  // A fresh request identity hides old values immediately, including disable/re-enable.
  const request = useMemo(() => ({ ownerAccountId }), [ownerAccountId]);
  const [state, setState] = useState<{ request: typeof request; kgPerCage?: number }>();
  useEffect(() => {
    if (!request.ownerAccountId) return;
    const controller = new AbortController();
    repository
      .read("settings", {}, harvestSettings, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        const value = result.status === "success" ? result.data.averageKgPerCage : undefined;
        setState({ kgPerCage: isUsableKgPerCage(value) ? value : undefined, request });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ request });
      });
    return () => controller.abort();
  }, [request]);
  if (!ownerAccountId) return { loading: false };
  return state?.request === request ? { kgPerCage: state.kgPerCage, loading: false } : { loading: true };
}
