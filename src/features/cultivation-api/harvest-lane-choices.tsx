import type { z } from "zod";
import type { harvestLane } from "./records-contracts";

type Lane = z.infer<typeof harvestLane>;
type Tone = "success" | "neutral";

export const laneStateChip: Record<string, { label: string; tone: Tone }> = {
  NotSeeded: { label: "Chưa thả giống", tone: "neutral" },
  Growing: { label: "Đang nuôi", tone: "neutral" },
  BeingHarvested: { label: "Đang thu hoạch", tone: "success" },
  Harvested: { label: "Đã thu xong", tone: "success" },
  OutOfService: { label: "Ngừng hoạt động", tone: "neutral" },
};
const reasonText: Record<string, string> = {
  LaneRemoved: "Làn đã ngừng hoạt động.",
  LaneDamaged: "Làn đang hỏng; cần sửa trước khi thu hoạch.",
  LaneOutOfService: "Làn đã ngừng hoạt động; số làn không dùng lại.",
  NoOpenCycle: "Bè chưa có chu kỳ đang nuôi.",
  ReadOnly: "Chu kỳ đang ở chế độ chỉ xem.",
  NoPermission: "Bạn chưa được phân quyền thu hoạch ở vùng này.",
  NotSeeded: "Làn chưa thả giống nên chưa thể thu hoạch.",
  AlreadyHarvested: "Làn đã thu xong.",
};

/** The state chip of a lane on the raft harvest screen, and why a lane cannot be harvested (read only: the whole raft is harvested from a plan). */
/** Why a lane cannot be harvested, in Vietnamese, or undefined when it can be. */
export const laneBlockedReason = (lane: Lane) => lane.statusId === 2002 ? reasonText.LaneRemoved
  : lane.isOutOfService || lane.state === "OutOfService" ? reasonText.LaneOutOfService : lane.isDamaged ? reasonText.LaneDamaged
  : lane.canHarvest ? undefined : reasonText[lane.reasonCode ?? ""] ?? "Làn chưa đủ điều kiện thu hoạch.";
