import { planPercent } from "@/features/farming-management/plan-bar";
import type { CycleFigures } from "./close-contracts";
import type { CycleView } from "./cycle-model";
import { buildJourney, laneIs, type JourneyLane, type JourneyStep } from "./cycle-journey-model";

/** Farming steps a figure can be given for (water and material have none: the strip model only marks material optional). */
export type StripKind = "nursery" | "cycle" | "seeding" | "harvest" | "material" | "water";
/** done = finished, active = in progress, todo = not started, neutral = no state to claim (optional step, no nursery). */
export type StripMark = "done" | "active" | "todo" | "neutral";
export type StripItem = { mark: StripMark; markLabel: string; figure: string; percent?: number; over?: boolean };
export type StripItems = Partial<Record<StripKind, StripItem>>;
export type StripInput = { cycle: CycleView; lanes: readonly JourneyLane[]; figures: CycleFigures };

const num = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
/** Nursery pieces are estimates: whole pieces only, so a raft's share never reads "1.777,78". */
const whole = (value: number) => Math.round(value).toLocaleString("vi-VN");
const markLabels: Record<StripMark, string> = { done: "Đã xong", active: "Đang thực hiện", todo: "Chưa bắt đầu", neutral: "" };
const item = (mark: StripMark, figure: string, plan?: { actual: number; target: number | null | undefined }): StripItem => {
  const percent = plan ? planPercent(plan.actual, plan.target) : undefined;
  return { mark, markLabel: markLabels[mark], figure, ...(percent !== undefined ? { percent, over: percent > 100 } : {}) };
};

/**
 * The one-line figures of ONE cycle (nursery, days of farming, seeding, harvest) for the figures row at the top of the Tổng hợp tab:
 * a state mark, a figure and, where a plan exists, plan progress. Step states come from `buildJourney`, so the row and the step cards never disagree.
 */
export function buildStripItems({ cycle, lanes, figures: f }: StripInput): StripItems {
  const steps = buildJourney({ cycle, lanes, figures: f, today: "", canClose: false, canEditPlan: false, canLog: false, canRecord: false });
  const step = (key: JourneyStep["key"]) => steps.find(entry => entry.key === key)!;
  const closed = !!cycle.closeDate, unit = f.seedUnit ?? "mảnh";

  const nursery = f.nursery;
  const nurseryItem = cycle.nurseryBatchId || nursery
    ? item("done", `${cycle.nurseryCode ?? nursery?.batchCode ?? "Đợt ươm"} · ${nursery?.survivors != null && nursery.quantityIn != null ? `${whole(nursery.survivors)}/${whole(nursery.quantityIn)} sống sót (ước tính)` : "đã hoàn tất ươm"}`)
    : item("neutral", "Không qua ươm");

  const days = cycle.daysOfFarming;
  const cycleItem = closed ? item("done", `Đã kết thúc · ${num(days)} ngày`) : item("active", `Ngày ${num(days)} · Đang nuôi`);

  const seedStarted = f.seedHung > 0 || f.seedingSessionCount > 0;
  const seedDone = !!cycle.seedingCompletedOn || closed && seedStarted;
  const seedPlan = f.expectedSeedQuantity;
  const seedPercent = planPercent(f.seedHung, seedPlan);
  const seedFigure = !seedStarted && !seedDone ? "Chưa thả giống"
    : `${seedDone ? "Hoàn tất · " : ""}${num(f.seedHung)}${seedPercent !== undefined ? `/${num(seedPlan as number)}` : ""} ${unit}${seedPercent !== undefined ? ` · ${num(seedPercent)}%` : ""}`;
  const seedingItem = item(seedDone ? "done" : seedStarted ? "active" : "todo", seedFigure, { actual: f.seedHung, target: seedPlan });

  // Lanes with seed (a removed lane is not part of the raft); a lane out of service counts as finished (BR-CYCLE-07).
  const seeded = lanes.filter(lane => lane.statusId !== 2002 && !laneIs(lane, "NotSeeded"));
  const finished = seeded.filter(lane => laneIs(lane, "Harvested") || laneIs(lane, "OutOfService")).length;
  const harvestMark = step("harvest").status === "done" ? "done" : step("harvest").status === "active" ? "active" : "todo";
  const harvestPercent = planPercent(f.kgHarvested, f.targetYieldKg);
  const harvestFigure = harvestMark === "todo" ? "Chưa thu hoạch"
    : `${num(f.kgHarvested)}${harvestPercent !== undefined ? `/${num(f.targetYieldKg as number)}` : ""} kg (ước tính)${seeded.length ? ` · ${finished}/${seeded.length} làn` : ""}`;
  const harvestItem = item(harvestMark, harvestFigure, { actual: f.kgHarvested, target: f.targetYieldKg });

  return { nursery: nurseryItem, cycle: cycleItem, seeding: seedingItem, harvest: harvestItem, material: item("neutral", "Tùy chọn, ghi khi cần") };
}
