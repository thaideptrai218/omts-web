export type LaneProgressFacts = {
  laneNumber: number; state?: string | number | null; statusId?: number;
  isDamaged?: boolean; isOutOfService?: boolean;
  seededPercent?: number | null; harvestedPercent?: number | null;
};
export const laneStateLabels = {
  NotSeeded: "Chưa thả", Growing: "Đang nuôi", BeingHarvested: "Đang thu",
  Harvested: "Đã thu", Damaged: "Hỏng", OutOfService: "Ngừng hoạt động", Available: "Đang sử dụng",
} as const;
export type LaneDisplayState = keyof typeof laneStateLabels;
const legacyStates = ["NotSeeded", "Growing", "BeingHarvested", "Harvested", "OutOfService"] as const;
const colorTokens: Record<LaneDisplayState, string> = {
  NotSeeded: "--omts-lane-empty", Available: "--omts-lane-empty", Growing: "--omts-lane-growing",
  BeingHarvested: "--omts-lane-harvesting", Harvested: "--omts-lane-harvested",
  Damaged: "--omts-lane-damaged", OutOfService: "--omts-lane-inactive",
};
const percent = (value?: number | null) => typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : undefined;
export const formatLanePercent = (value: number | null) => value === null ? "Chưa ghi %" : `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;

/** Percentages are authoritative; physical incidents always win. Never invent a partial harvest percentage. */
export function laneProgressDisplay(lane: LaneProgressFacts) {
  const legacy = typeof lane.state === "number" ? legacyStates[lane.state] : lane.state;
  const known = legacy && Object.hasOwn(laneStateLabels, legacy) ? legacy as LaneDisplayState : "Available";
  const seeded = percent(lane.seededPercent), harvested = percent(lane.harvestedPercent);
  const seededPercent = seeded ?? (["Growing", "BeingHarvested", "Harvested"].includes(known) ? 100 : 0);
  const harvestedPercent = harvested ?? (known === "Harvested" ? 100 : known === "BeingHarvested" ? null : 0);
  let state: LaneDisplayState = known;
  if (seeded !== undefined || harvested !== undefined) state = harvestedPercent === 100 ? "Harvested"
    : harvestedPercent === null && known === "BeingHarvested" || harvestedPercent !== null && harvestedPercent > 0 ? "BeingHarvested" : seededPercent > 0 ? "Growing" : "NotSeeded";
  if (lane.isDamaged || known === "Damaged") state = "Damaged";
  if (lane.isOutOfService || lane.statusId === 2002 || known === "OutOfService") state = "OutOfService";
  const fillPercent = state === "Damaged" || state === "OutOfService" ? 100
    : state === "Harvested" || state === "BeingHarvested" ? harvestedPercent : seededPercent;
  return { state, label: laneStateLabels[state], colorToken: colorTokens[state], seededPercent, harvestedPercent,
    fillPercent, percentLabel: formatLanePercent(fillPercent),
    inferred: seeded === undefined || harvested === undefined,
    description: `${laneStateLabels[state]} · Đã thả ${formatLanePercent(seededPercent)} · Đã thu ${formatLanePercent(harvestedPercent)}` };
}
