"use client";
import { useCallback, useRef, useState, type ComponentProps } from "react";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { LaneOverview, type LaneOverviewItem } from "@/features/farming-management/lane-overview";
import { LaneOperatingDetails, type LaneOperatingScope } from "./lane-operating-details";
import type { IncidentRaft, LaneDraftState } from "./lane-incident-details";
import type { LaneProgressMetadata } from "@/features/farming-management/lane-progress-contracts";
const sourceKey = (lane?: LaneOverviewItem) => JSON.stringify([lane?.state, lane?.seededPercent, lane?.harvestedPercent, lane?.rowVersion]);

/** One guard covers both progress and incident drafts, including outside click and Escape. */
export function OperatingLaneOverview({ scope, raft, onDirty, onPending, ...overview }: ComponentProps<typeof LaneOverview> & {
  scope: LaneOperatingScope; raft?: IncidentRaft; onDirty?(dirty: boolean): void; onPending?(pending: boolean): void;
}) {
  const [opened, setOpened] = useState<number>();
  const [progressUnsupported, setProgressUnsupported] = useState(false);
  const [savedProgress, setSavedProgress] = useState<Record<number, { source: string; value: LaneProgressMetadata }>>({});
  const state = useRef<LaneDraftState>({ dirty: false, pending: false }), confirmation = useActionDialog();
  const report = useCallback((next: LaneDraftState) => { state.current = next; onDirty?.(next.dirty); onPending?.(next.pending); }, [onDirty, onPending]);
  async function switchLane(number?: number) {
    if (state.current.pending || state.current.dirty && !await confirmation.confirm("Bỏ các thay đổi chưa lưu của làn?")) return false;
    setOpened(number); return true;
  }
  return <>{confirmation.dialog}<LaneOverview {...overview} lanes={overview.lanes.map(lane => ({ ...lane, ...(savedProgress[lane.laneNumber]?.source === sourceKey(lane) ? savedProgress[lane.laneNumber]?.value : {}) }))} opened={opened} onCloseLane={() => switchLane()}
    onLaneClick={async (number, event) => { const accepted = await switchLane(opened === number ? undefined : number); if (accepted) await overview.onLaneClick?.(number, event); return accepted; }}
    renderLaneDetails={lane => <><LaneOperatingDetails key={lane.laneNumber} scope={scope} lane={lane} raft={raft} onStateChange={report} progressUnsupported={progressUnsupported} onProgressUnsupported={() => setProgressUnsupported(true)} onProgressSaved={saved => setSavedProgress(current => ({ ...current, [saved.laneNumber]: { source: sourceKey(overview.lanes.find(item => item.laneNumber === saved.laneNumber)), value: saved } }))} />{overview.renderLaneDetails?.(lane)}</>} />
  </>;
}
