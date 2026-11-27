"use client";
import type { Raft } from "@/features/farming-api/contracts";
import { OperatingLaneOverview } from "./operating-lane-overview";
import { mergeLiveLanes, type LiveLane } from "./raft-live-model";

/** The raft the lane board needs: the record read for its photos (`Raft`) or the raft detail with its zone id. */
export type LaneBoardRaft = Pick<Raft, "id" | "code" | "statusId" | "rowVersion" | "lanes"> & { zone: { id: string } };
/** `liveLanes` (today's progress of the open cycle) gives every column its real state and seeded/harvested %; without it the lanes show only their physical status. */
export function LaneIncidentsBoard({ raft, liveLanes, onChanged, onDirty, onPending }: {
  raft: LaneBoardRaft; liveLanes?: readonly LiveLane[]; onChanged(): void; onDirty?(dirty: boolean): void; onPending?(pending: boolean): void;
}) {
  // A removed lane (status 2002) is no longer part of the raft: it gets no column and no incident actions.
  return <OperatingLaneOverview lanes={mergeLiveLanes(raft.lanes, liveLanes).filter(lane => lane.statusId !== 2002)} label="Các làn của bè" onDirty={onDirty} onPending={onPending}
    scope={{ raftId: raft.id, zoneId: raft.zone.id, onChanged }}
    raft={{ id: raft.id, code: raft.code, zoneId: raft.zone.id, statusId: raft.statusId, rowVersion: raft.rowVersion }}
    renderLaneDetails={lane => {
      const physical = raft.lanes.find(item => item.laneNumber === lane.laneNumber);
      return physical?.lineLengthM != null && <p className="mt-2 text-xs text-text-muted">Độ dài dây: {physical.lineLengthM.toLocaleString("vi-VN")} m</p>;
    }} />;
}
