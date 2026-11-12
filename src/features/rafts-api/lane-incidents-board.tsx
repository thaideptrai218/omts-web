"use client";
import type { Raft } from "@/features/farming-api/contracts";
import { OperatingLaneOverview } from "./operating-lane-overview";

export function LaneIncidentsBoard({ raft, onChanged, onDirty, onPending }: {
  raft: Raft; onChanged(): void; onDirty?(dirty: boolean): void; onPending?(pending: boolean): void;
}) {
  return <OperatingLaneOverview lanes={raft.lanes} label="Các làn của bè" onDirty={onDirty} onPending={onPending}
    scope={{ raftId: raft.id, zoneId: raft.zone.id, onChanged }}
    raft={{ id: raft.id, code: raft.code, zoneId: raft.zone.id, statusId: raft.statusId, rowVersion: raft.rowVersion }}
    renderLaneDetails={lane => {
      const physical = raft.lanes.find(item => item.laneNumber === lane.laneNumber);
      return physical?.lineLengthM != null && <p className="mt-2 text-xs text-text-muted">Độ dài dây: {physical.lineLengthM.toLocaleString("vi-VN")} m</p>;
    }} />;
}
