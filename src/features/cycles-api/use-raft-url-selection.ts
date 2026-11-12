"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { replaceUrlParams } from "@/features/farming-management/replace-url-params";
import type { CycleRow } from "./cycle-model";

/**
 * Keeps the raft a user opens in a per-raft screen in the URL (`zoneId`, `raftId`, `cycleId`, plus the tab the row opens on), so the
 * journey bar above the screen shows that raft's progress and the address can be shared. Closing the row (or changing zone) removes them.
 *
 * `epoch` changes only when the raft/cycle in the URL was changed by something else (a link, the back button), never by `select`:
 * the screen is re-created on an outside change (to open the linked raft) but keeps its page, filters and open row after its own writes.
 */
export function useRaftUrlSelection(openTab?: string) {
  const params = useSearchParams();
  const link = `${params?.get("raftId") ?? ""}:${params?.get("cycleId") ?? ""}`;
  const [own, setOwn] = useState(link), [seen, setSeen] = useState(link), [epoch, setEpoch] = useState(0);
  if (link !== seen) { setSeen(link); if (link !== own) setEpoch(value => value + 1); }
  /** `row` opened, or nothing selected (row omitted). `zoneId` is kept in the URL after a close. */
  const select = (zoneId: string, row?: CycleRow) => {
    setOwn(`${row?.raftId ?? ""}:${row?.cycle?.id ?? ""}`);
    replaceUrlParams(row ? { zoneId, raftId: row.raftId, cycleId: row.cycle?.id, tab: openTab } : { zoneId, raftId: null, cycleId: null, tab: null });
  };
  return { epoch, select };
}
