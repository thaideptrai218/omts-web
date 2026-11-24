"use client";
import { useEffect, useState } from "react";
import { cycleProgress } from "@/features/cycles-api/contracts";
import { readCycles } from "@/features/cycles-api/repository";
import { phaseLabel, summarizeLanes, type LaneSummary } from "./raft-live-model";

/** What a list row shows about the raft right now: lanes by state, the phase of its cycle and the days farmed. */
export type RaftListLive = { summary: LaneSummary; phase: string; open: boolean; days?: number };
export type RaftListLiveState = RaftListLive | "error";
const WORKERS = 4;

/**
 * Today's lane progress of the rafts on screen (one read per raft, four at a time, only for the page shown), so the list says
 * "6/10 làn đang nuôi" instead of only the lane count entered at creation. `refresh` re-reads after the list itself was reloaded.
 */
export function useRaftListLive(raftIds: readonly string[], enabled: boolean, refresh: unknown) {
  const [rows, setRows] = useState<Record<string, RaftListLiveState>>({}), key = raftIds.join(",");
  useEffect(() => {
    if (!enabled || !key) return;
    const controller = new AbortController(), queue = key.split(",");
    async function worker() {
      for (let id = queue.shift(); id; id = queue.shift()) {
        const result = await readCycles({ action: "progress", raftId: id }, cycleProgress, controller.signal);
        if (controller.signal.aborted) return;
        const state: RaftListLiveState = result.status === "success"
          ? { summary: summarizeLanes(result.data.lanes), phase: phaseLabel(result.data), open: !!result.data.cycle && !result.data.cycle.closeDate, days: result.data.cycle && !result.data.cycle.closeDate ? result.data.cycle.daysOfFarming : undefined } : "error";
        setRows(current => ({ ...current, [id]: state }));
      }
    }
    void Promise.all(Array.from({ length: WORKERS }, worker));
    return () => controller.abort();
  }, [key, enabled, refresh]);
  return rows;
}
