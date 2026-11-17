import { formatVietnameseDate } from "@/shared/format/date-only";
import { compressLaneNumbers } from "@/features/farming-management/lane-ranges";
import type { CycleFigures } from "./close-contracts";
import { farmedSeedName } from "./cycle-farmed-seed";
import type { CycleView } from "./cycle-model";

export type JourneyKey = "nursery" | "plan" | "seeding" | "care" | "harvest" | "summary";
export type JourneyStatus = "done" | "active" | "todo";
export type JourneyBar = { label: string; actual: number; plan: number | null; unit: string; estimate?: boolean; note?: string };
/** The ONE primary action of a step: a tab of the same page, a screen of the flow, or the close panel. */
export type JourneyAction = { key: string; label: string; tab?: "plan" | "logs"; screen?: "seeding" | "material" | "harvest"; close?: true };
export type JourneyStep = { key: JourneyKey; label: string; status: JourneyStatus; chip: string; lines: string[]; bars: JourneyBar[]; action?: JourneyAction };
export type JourneyLane = { laneNumber: number; state: string; statusId?: number; isDamaged?: boolean; isOutOfService?: boolean };
export type JourneyInput = { cycle: CycleView; lanes: readonly JourneyLane[]; figures: CycleFigures; today: string; canClose: boolean; canEditPlan: boolean; canLog: boolean; canRecord: boolean };

export const statusLabel: Record<JourneyStatus, string> = { done: "Xong", active: "Đang làm", todo: "Chưa tới" };
const list = compressLaneNumbers;
const kg = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
/** Nursery pieces are estimates: shown as whole pieces. */
const pcs = (value: number) => Math.round(value).toLocaleString("vi-VN");
export const laneIs = (lane: JourneyLane, state: string) => lane.state === state;

/**
 * The five steps of a cycle (Kế hoạch, Thả giống, Chăm sóc, Thu hoạch, Tổng kết) as a pure function of the cycle, its lanes and the summary figures.
 * Every step carries plan vs actual bars, a status and at most one primary action; nothing here asks the user for new input.
 */
export function buildJourney(input: JourneyInput): JourneyStep[] {
  const { cycle, figures: f } = input, closed = !!cycle.closeDate;
  // A removed lane (status 2002) is not part of the raft any more; an out-of-service lane without seed is never "still to seed".
  const lanes = input.lanes.filter(lane => lane.statusId !== 2002);
  const seeded = lanes.filter(lane => !laneIs(lane, "NotSeeded")), notSeeded = lanes.filter(lane => laneIs(lane, "NotSeeded") && !lane.isOutOfService);
  const being = seeded.filter(lane => laneIs(lane, "BeingHarvested")), harvested = seeded.filter(lane => laneIs(lane, "Harvested")), lost = seeded.filter(lane => laneIs(lane, "OutOfService"));
  // BR-CYCLE-07: every lane with seed is Harvested or out of service (a lane out of service is finished, not "not harvested").
  const allHarvested = seeded.length > 0 && harvested.length + lost.length === seeded.length;
  const unit = f.seedUnit ?? "mảnh";
  const planned = cycle.targetYieldKg !== null;

  // The planned yield belongs to the cycle (NURSERY MODEL V2); the pieces to seed come from the nursed batch, so a planned seed quantity shows only on an old cycle that has one.
  const plan: JourneyStep = { key: "plan", label: "Kế hoạch", status: "done", chip: `Bắt đầu ${formatVietnameseDate(cycle.startDate)}`, bars: [],
    lines: [cycle.targetYieldKg !== null ? `Sản lượng dự kiến: ${kg(cycle.targetYieldKg)} kg` : "Chưa lập sản lượng dự kiến",
      ...(cycle.expectedSeedQuantity != null ? [`Giống dự kiến: ${kg(cycle.expectedSeedQuantity)}${unit ? ` ${unit}` : ""}`] : [])],
    ...(!closed && !planned && input.canEditPlan ? { action: { key: "journey-plan", label: "Lập kế hoạch", tab: "plan" as const } } : {}) };

  const seedingDone = closed || !!cycle.seedingCompletedOn;
  const seeding: JourneyStep = { key: "seeding", label: "Thả giống", status: seedingDone ? "done" : "active",
    chip: cycle.seedingCompletedOn ? `Đã hoàn tất ${formatVietnameseDate(cycle.seedingCompletedOn)}` : lanes.length ? `${seeded.length}/${lanes.length} làn đã thả` : "Chưa thả giống",
    bars: [{ label: "Giống đã thả", actual: f.seedHung, plan: f.expectedSeedQuantity ?? null, unit }],
    lines: [`${f.seedingSessionCount} lần thả giống`, ...(notSeeded.length ? [`Làn chưa thả: ${list(notSeeded.map(lane => lane.laneNumber))}`] : [])],
    ...(!seedingDone && input.canRecord ? { action: { key: notSeeded.length ? "journey-seeding-record" : "journey-seeding-complete", label: notSeeded.length ? "Ghi nhận thả giống" : "Hoàn tất thả giống", screen: "seeding" as const } } : {}) };

  const care: JourneyStep = { key: "care", label: "Chăm sóc", status: closed ? "done" : seeded.length || f.seedingSessionCount ? "active" : "todo", chip: closed ? "Đã kết thúc" : seeded.length || f.seedingSessionCount ? "Đang làm" : "Chưa tới",
    bars: [], lines: ["Nhật ký chăm sóc và vật tư sửa chữa của chu kỳ"],
    ...(!closed && input.canLog ? { action: { key: "journey-care-log", label: "Ghi nhật ký chăm sóc", tab: "logs" as const } } : {}) };

  const harvestStatus: JourneyStatus = closed || allHarvested ? "done" : f.harvestLotCount || being.length ? "active" : "todo";
  const harvest: JourneyStep = { key: "harvest", label: "Thu hoạch", status: harvestStatus,
    chip: allHarvested ? lost.length ? "Đã thu xong, có làn ngừng hoạt động" : "Đã thu xong" : being.length ? `Đang thu: làn ${list(being.map(lane => lane.laneNumber))}` : f.harvestLotCount ? "Đã có chuyến thu" : "Chưa thu hoạch",
    bars: [{ label: "Sản lượng thu hoạch", actual: f.kgHarvested, plan: f.targetYieldKg ?? null, unit: "kg", estimate: true, note: `${f.harvestLotCount} chuyến · ${(f.harvestedCages ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} lồng` }],
    lines: [...(f.lastHarvestDate ? [`Thu gần nhất ${formatVietnameseDate(f.lastHarvestDate)}`] : []),
      ...(f.remainingKg !== null && f.remainingKg !== undefined ? [f.remainingKg >= 0 ? `Còn ${kg(f.remainingKg)} kg để đạt mục tiêu` : `Vượt mục tiêu ${kg(-f.remainingKg)} kg`] : [])],
    ...(!closed && !allHarvested && seeded.length && input.canRecord ? { action: { key: "journey-harvest", label: being.length ? "Thu hoạch và hoàn tất làn" : "Ghi nhận thu hoạch", screen: "harvest" as const } } : {}) };

  const early = f.notHarvestedLanes.length ? `Còn làn ${list(f.notHarvestedLanes)} chưa thu xong: kết thúc bây giờ là kết thúc sớm.` : f.earlyReason === "NoSeedingSession" ? "Chưa có lần thả giống: kết thúc bây giờ là kết thúc sớm." : undefined;
  const summary: JourneyStep = { key: "summary", label: "Tổng kết", status: closed ? "done" : allHarvested ? "active" : "todo", chip: closed ? `Đã kết thúc ${formatVietnameseDate(cycle.closeDate!)}` : allHarvested ? "Sẵn sàng kết thúc" : "Chưa tới",
    bars: [], lines: [...(f.nursery ? [`Ươm ${f.nursery.batchCode}: vào ${f.nursery.quantityIn == null ? "—" : pcs(f.nursery.quantityIn)} mảnh (ước tính), sống sót ${f.nursery.survivors == null ? "—" : pcs(f.nursery.survivors)} mảnh (ước tính), hao hụt ${f.nursery.lossPieces == null ? "—" : pcs(f.nursery.lossPieces)} mảnh${f.nursery.lossPercent == null ? "" : ` (${kg(f.nursery.lossPercent)}%)`} (ước tính)`] : []), `Thả ${kg(f.seedHung)}${unit ? ` ${unit}` : ""}, thu ${kg(f.kgHarvested)} kg ước tính, ${f.daysOfFarming} ngày nuôi`,
      ...(f.lostLanes ?? []).map(item => `Làn ${item.laneNumber} ngừng hoạt động${item.date ? ` ngày ${formatVietnameseDate(item.date)}` : ""}${item.reason ? `: ${item.reason}` : ""}. Ghi nhận mất giống, không có số lượng; làn được tính là đã kết thúc.`),
      ...(!closed && f.damagedLanes?.length ? [`Làn ${list(f.damagedLanes)} đang hỏng, chưa sửa.`] : []), ...(!closed && early ? [early] : []), ...(closed && cycle.assessment ? [`Đánh giá: ${cycle.assessment}`] : [])],
    ...(!closed && input.canClose ? { action: { key: "journey-close", label: "Kết thúc chu kỳ", close: true as const } } : {}) };
  // The nursed batch of the cycle and what is left in its nursery pool (shared by every raft that takes seed from it).
  const nursery: JourneyStep[] = cycle.nurseryBatchId ? [{ key: "nursery", label: "Ươm", status: "done", chip: [cycle.nurseryCode ?? "Đợt ươm", farmedSeedName(cycle), cycle.seedLot?.code ? `lô ${cycle.seedLot.code}` : null].filter(Boolean).join(" · "), bars: [],
    lines: [...(cycle.nurserySeeded != null ? [`Đã thả: ${pcs(cycle.nurserySeeded)} mảnh`] : []), ...(cycle.nurseryRemaining != null ? [`Còn trong kho ươm: ${pcs(cycle.nurseryRemaining)} mảnh`] : [])] }] : [];
  return [...nursery, plan, seeding, care, harvest, summary];
}

/** The step the owner should look at now: first one that is "active", else the first "todo", else the last. */
export const currentStep = (steps: readonly JourneyStep[]): JourneyKey => (steps.find(step => step.status === "active") ?? steps.find(step => step.status === "todo") ?? steps[steps.length - 1]).key;
