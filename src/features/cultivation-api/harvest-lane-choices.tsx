"use client";
import { StatusPill } from "@/components/ui/management-page";
import type { z } from "zod";
import type { harvestLane } from "./records-contracts";

type Lane = z.infer<typeof harvestLane>;
type Tone = "success" | "neutral";

export const laneStateChip: Record<string, { label: string; tone: Tone }> = {
  NotSeeded: { label: "Chưa thả giống", tone: "neutral" },
  Growing: { label: "Đang nuôi", tone: "neutral" },
  BeingHarvested: { label: "Đang thu hoạch", tone: "success" },
  Harvested: { label: "Đã thu xong", tone: "success" },
};
const reasonText: Record<string, string> = {
  LaneRemoved: "Làn đã được gỡ khỏi bè.",
  NoOpenCycle: "Bè chưa có chu kỳ đang nuôi.",
  ReadOnly: "Chu kỳ đang ở chế độ chỉ xem.",
  NoPermission: "Bạn chưa được phân quyền thu hoạch ở vùng này.",
  NotSeeded: "Làn chưa thả giống nên chưa thể thu hoạch.",
  AlreadyHarvested: "Làn đã thu xong.",
};

/** Why a lane cannot be picked, in Vietnamese, or undefined when it can be. */
export const laneBlockedReason = (lane: Lane) => (lane.canHarvest ? undefined : reasonText[lane.reasonCode ?? ""] ?? "Làn chưa đủ điều kiện thu hoạch.");

/** All lanes of the raft with their state; only eligible lanes (including those already being harvested) are selectable. */
export function HarvestLaneChoices({ lanes, values, onChange, label }: { lanes: Lane[]; values: number[]; onChange(values: number[]): void; label: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {lanes.map((lane) => {
          const blocked = laneBlockedReason(lane), chip = lane.state ? laneStateChip[lane.state] : undefined;
          return (
            <label key={lane.laneNumber} className={`flex items-start gap-2 rounded-control border border-border px-3 py-2 text-sm ${blocked ? "opacity-70" : ""}`}>
              <input
                type="checkbox"
                className="omts-check mt-0.5"
                disabled={!!blocked}
                checked={values.includes(lane.laneNumber)}
                onChange={(event) => onChange(event.target.checked ? [...values, lane.laneNumber].sort((a, b) => a - b) : values.filter((value) => value !== lane.laneNumber))}
              />
              <span className="grid gap-1">
                <span className="flex flex-wrap items-center gap-2">Làn {lane.laneNumber}{chip && <StatusPill tone={chip.tone}>{chip.label}</StatusPill>}</span>
                {blocked && <span className="text-xs text-text-muted">{blocked}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
