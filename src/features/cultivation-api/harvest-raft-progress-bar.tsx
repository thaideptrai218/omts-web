"use client";
import { useCallback } from "react";
import { useRemote } from "@/features/operations/ui";
import { raftHarvestProgress, type ProgressLane } from "./harvest-raft-progress";
import { harvestList } from "./records-contracts";
import { harvestRepo } from "./records-shared";

/** Read only bar: "Đã thu 60% (15/25 làn)". Nothing is shown for a raft without lanes to harvest. */
export function HarvestRaftProgressBar({ lanes }: { lanes: readonly ProgressLane[] }) {
  const progress = raftHarvestProgress(lanes);
  if (!progress) return null;
  const text = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(progress.percent);
  return <div className="grid gap-1" aria-label="Tiến độ thu hoạch của bè">
    <p className="text-sm"><strong>Đã thu {text}%</strong> <span className="text-text-muted">({progress.done}/{progress.total} làn)</span></p>
    <div role="progressbar" aria-label="Phần bè đã thu hoạch" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.percent)} aria-valuetext={`${text}% đã thu`} className="h-2 overflow-hidden rounded-full bg-surface-subtle">
      <div className="h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
    </div>
  </div>;
}

/** The same bar for a screen that does not hold the raft's lanes yet: reads them once; a read that fails shows nothing. */
export function HarvestRaftProgress({ raftId, zoneId }: { raftId: string; zoneId: string }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => harvestRepo.read("list", { id: raftId, zoneId }, harvestList, signal), [raftId, zoneId]));
  return remote.data ? <HarvestRaftProgressBar lanes={remote.data.lanes} /> : null;
}
