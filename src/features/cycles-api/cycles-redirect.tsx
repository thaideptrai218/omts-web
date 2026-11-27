"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { Skeleton } from "@/features/operations/ui";

/**
 * Where an old cycle address (`/farming/cycles`, with `zoneId`, `raftId`, `cycleId`, `search`, `tab`, `nurseryBatch`) now goes: the raft screen, with that raft opened on
 * its "Chu kỳ nuôi" tab. The cycle id is not needed (the tab shows the open cycle and the history); `nurseryBatch` is kept so starting a cycle from a nursery batch still preselects it.
 */
export function cycleRedirectTarget(params: Pick<URLSearchParams, "get">): string {
  const target = farmingReferenceHref("cycle", { zoneId: params.get("zoneId"), raftId: params.get("raftId"), search: params.get("search"), tab: params.get("tab") });
  const batch = params.get("nurseryBatch")?.trim();
  return batch ? `${target}${target.includes("?") ? "&" : "?"}nurseryBatch=${encodeURIComponent(batch)}` : target;
}

export function CyclesRedirect() {
  const router = useRouter(), target = cycleRedirectTarget(useSearchParams() ?? new URLSearchParams());
  useEffect(() => { router.replace(target); }, [router, target]);
  return <Skeleton />;
}
