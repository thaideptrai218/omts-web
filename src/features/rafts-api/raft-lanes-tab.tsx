"use client";
import { useCallback, useEffect, useState } from "react";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { cycleProgress } from "@/features/cycles-api/contracts";
import { readCycles } from "@/features/cycles-api/repository";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import type { RefObject } from "react";
import { Skeleton } from "@/features/operations/ui";
import { skipped } from "@/features/zones-api/zone-summary-reads";
import { LaneIncidentsBoard } from "./lane-incidents-board";
import type { RaftDetail } from "./raft-model";

/**
 * "Làn": only the lane board of the raft ("Các làn của bè": progress, filters, lane search, one column per lane with its incidents). Today's lane progress is read when the
 * tab opens (when the account may read cycles); a lane change reads it again and asks the screen to read the raft record again.
 */
export function RaftLanesTab({ raft, zoneId, canReadCycles, dirtyRef, pendingRef, onReload }: { raft: RaftDetail; zoneId: string; canReadCycles: boolean; dirtyRef: RefObject<boolean>; pendingRef: RefObject<boolean>; onReload(): void }) {
  const progress = useStickyRemote(useCallback((signal: AbortSignal) => canReadCycles ? readCycles({ action: "progress", raftId: raft.id }, cycleProgress, signal) : skipped(undefined), [canReadCycles, raft.id]));
  const [dirty, setDirty] = useState(false), [pending, setPending] = useState(false);
  useEffect(() => {
    dirtyRef.current = dirty; pendingRef.current = pending;
    return () => { dirtyRef.current = false; pendingRef.current = false; };
  }, [dirty, pending, dirtyRef, pendingRef]);
  if (progress.loading && !progress.data && canReadCycles) return <Skeleton />;
  return <>
    {progress.error && !progress.data && <ListStateMessage error={progress.error} onRetry={progress.reload} retryLabel="Tải lại tiến độ làn" />}
    <LaneIncidentsBoard raft={{ ...raft, zone: { id: zoneId } }} liveLanes={progress.data?.lanes} onDirty={setDirty} onPending={setPending} onChanged={() => { progress.reload(); onReload(); }} />
  </>;
}
