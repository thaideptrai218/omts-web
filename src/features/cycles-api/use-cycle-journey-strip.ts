"use client";
import { useCallback, useEffect, useState } from "react";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { MUTATION_EVENT } from "@/features/auth/api/mutation-event";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import { businessToday } from "@/features/operations/ui";
import { cycleProgress } from "./contracts";
import { buildStripItems, type StripItems } from "./cycle-journey-strip-model";
import { readCycles, readCycleSummary } from "./repository";

/** "loading": first read in flight (reserve the bar's height); "ready": figures per step; "plain": no cycle in context or the read failed. */
export type CycleJourneyStrip = { state: "loading" } | { state: "ready"; items: StripItems } | { state: "plain" };
const PLAIN: CycleJourneyStrip = { state: "plain" };

/**
 * Progress of every journey step for the cycle in context: the cycle named by `cycleId`, else the open cycle of `raftId`.
 * One progress read (cycle + lanes) and one summary read (figures); they run together when the cycle id is known.
 * Failure is silent: the bar falls back to the plain numbered steps. It re-reads after any successful write of this browser tab.
 */
export function useCycleJourneyStrip({ raftId, cycleId, enabled }: { raftId: string | null; cycleId: string | null; enabled: boolean }): CycleJourneyStrip {
  const [stale, setStale] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Several writes in a row (a dialog saving two things) trigger one re-read.
    const onChange = () => { clearTimeout(timer); timer = setTimeout(() => setStale(value => value + 1), 400); };
    window.addEventListener(MUTATION_EVENT, onChange);
    return () => { window.removeEventListener(MUTATION_EVENT, onChange); clearTimeout(timer); };
  }, []);
  const remote = useStickyRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<{ raftId: string; items: StripItems } | null>> => {
    void stale;
    if (!enabled || !raftId) return { status: "success", data: null };
    const early = cycleId ? readCycleSummary(cycleId, signal) : undefined;
    const progress = await readCycles({ action: "progress", raftId, ...(cycleId ? { cycleId } : { date: businessToday() }) }, cycleProgress, signal);
    if (progress.status !== "success") return progress;
    const cycle = progress.data.cycle;
    // Without a cycle in the link only an OPEN cycle of the raft is "the cycle in context".
    if (!cycle || !cycleId && cycle.closeDate) return { status: "success", data: null };
    const summary = await (early ?? readCycleSummary(cycle.id, signal));
    if (summary.status !== "success") return summary;
    return { status: "success", data: { raftId, items: buildStripItems({ cycle, lanes: progress.data.lanes, figures: summary.data }) } };
  }, [enabled, raftId, cycleId, stale]));
  if (!enabled || !raftId) return PLAIN;
  // Keep the last figures while a re-read runs; never show another raft's figures.
  if (remote.data && remote.data.raftId === raftId) return { state: "ready", items: remote.data.items };
  return remote.loading && !remote.error ? { state: "loading" } : PLAIN;
}
