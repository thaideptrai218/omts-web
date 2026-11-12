import { toInstant } from "@/features/sales-orders/order-logic";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import type { EligibleLane, PlanLane, PlanLine, PlanView } from "./contracts";
import { PLAN } from "./contracts";

/** Pure rules of the harvest plan: the lane chips, the totals of a plan, the form lines and the body sent to the API. */
export const laneStateLabel: Record<PlanLane["state"], string> = { Planned: "Kế hoạch", Harvested: "Đã thu", Skipped: "Không thu" };

export type LaneChip = { number: number; text: string; state: PlanLane["state"]; lotCode?: string; title?: string };
/** One chip of a line: "Luống 3" with its state; a harvested lane names its lot, a skipped lane carries the reason as a tooltip. */
export function laneChip(lane: PlanLane): LaneChip {
  const title = lane.state === "Skipped" ? lane.skipReason || "Không thu" : lane.state === "Harvested" ? lane.lotCode ? `Đã thu trong lô ${lane.lotCode}` : "Đã thu" : undefined;
  return { number: lane.laneNumber, text: `Luống ${lane.laneNumber}: ${laneStateLabel[lane.state]}`, state: lane.state, ...(lane.lotCode ? { lotCode: lane.lotCode } : {}), ...(title ? { title } : {}) };
}

/** The lanes of a line still to harvest: planned, not skipped, not in a lot. */
export const plannedLaneNumbers = (line: Pick<PlanLine, "lanes">) => line.lanes.filter((lane) => lane.state === "Planned").map((lane) => lane.laneNumber).sort((a, b) => a - b);
/** A line can be harvested now when the API allows it, it has no lot yet and a lane is left to harvest. */
export const lineCanHarvest = (line: Pick<PlanLine, "lanes" | "lot" | "canHarvest">) => line.canHarvest && !line.lot && plannedLaneNumbers(line).length > 0;

export function planTotals(lines: readonly PlanLine[]) {
  const lanes = lines.flatMap((line) => line.lanes);
  const cages = lines.some((line) => line.expectedCageCount != null) ? lines.reduce((sum, line) => sum + (line.expectedCageCount ?? 0), 0) : null;
  return {
    rafts: new Set(lines.map((line) => line.raftId)).size, lanes: lanes.length, cages, lots: lines.filter((line) => line.lot).length, lines: lines.length,
    harvested: lanes.filter((lane) => lane.state === "Harvested").length, skipped: lanes.filter((lane) => lane.state === "Skipped").length,
  };
}

/**
 * One line of the form: a zone, one raft of it and the lanes of that raft. The zone only narrows the choice of raft (the API takes the zone from the raft); the
 * product is the one the raft farms and is never typed. A line with a lot or a skipped lane cannot be changed once the plan is given out.
 */
export type FormLine = { key: string; id?: string; zoneId: string; raftId: string; laneNumbers: number[]; cages: string; note: string; locked: boolean };
export type PlanForm = { code: string; plannedAt: string; note: string; orderIds: string[]; lines: FormLine[]; rowVersion?: string };

export const blankFormLine = (zoneId = ""): FormLine => ({ key: crypto.randomUUID(), zoneId, raftId: "", laneNumbers: [], cages: "", note: "", locked: false });

export function formLineOf(line: PlanLine, givenOut: boolean): FormLine {
  return {
    key: crypto.randomUUID(), id: line.id, zoneId: line.zone.id, raftId: line.raftId, laneNumbers: line.lanes.map((lane) => lane.laneNumber).sort((a, b) => a - b),
    cages: line.expectedCageCount == null ? "" : String(line.expectedCageCount), note: line.note ?? "", locked: givenOut && line.locked,
  };
}
/** The form of an existing plan; `plannedAt` is the wall time at +07:00 the caller worked out (the picker works in it). */
export const formOf = (plan: PlanView, plannedAt: string): PlanForm => ({
  code: plan.code, plannedAt, note: plan.note ?? "", orderIds: plan.orders.map((order) => order.id), rowVersion: plan.rowVersion,
  lines: plan.lines.map((line) => formLineOf(line, plan.statusId !== PLAN.draft)),
});

/** What the linked orders still ask of one product, from an order line: ordered less delivered, in the unit of the line (`factor` kg per unit). */
export type OrderNeedLine = { productId: string; productName: string; unitId: string; unitName: string; factor: number; quantity: number; deliveredQuantity: number };
export type CoverageState = "enough" | "short" | "over" | "unknown";
/**
 * One product of the linked orders against the plan: `need` is what is still to deliver and `planned` what the lines of rafts farming it expect, both in `unit`
 * (the unit of the order lines when they all share one, otherwise kg). `planned` is null when the cages cannot be turned into that unit (no kg per cage known).
 * `gap` is planned less need (rounded to one decimal) and `cagesShort` the cages still missing, rounded up, for a new line to start from.
 */
export type CoverageRow = { productId: string; productName: string; unit: string; need: number; planned: number | null; gap: number | null; state: CoverageState; cagesShort: number };

const round1 = (value: number) => Math.round(value * 10) / 10;
/** The "Lồng" unit of a product, by name without diacritics (the order unit list names it so). */
export const isCageUnit = (unitName: string) => ["long", "cage"].includes(foldVietnamese(unitName.trim()).toLowerCase());

/**
 * The coverage of every product the orders still have to deliver by the cages the plan expects of it. With one unit on the order lines the result is in that unit
 * (cages compare directly; any other unit goes through kg: cages x kg per cage / factor); with several units, or when orders mix units, in kg (quantity x factor
 * against cages x kg per cage). Lines with nothing left to deliver are ignored.
 */
export function coverage(lines: readonly OrderNeedLine[], plannedCages: ReadonlyMap<string, number>, kgPerCage?: number): CoverageRow[] {
  const left = lines.map((line) => ({ ...line, remaining: line.quantity - line.deliveredQuantity })).filter((line) => line.remaining > 0);
  const byProduct = new Map<string, typeof left>();
  for (const line of left) byProduct.set(line.productId, [...(byProduct.get(line.productId) ?? []), line]);
  const kgOfCage = kgPerCage != null && Number.isFinite(kgPerCage) && kgPerCage > 0 ? kgPerCage : null;
  return [...byProduct.entries()].map(([productId, rows]): CoverageRow => {
    const cages = plannedCages.get(productId) ?? 0, productName = rows[0].productName, remaining = rows.reduce((sum, row) => sum + row.remaining, 0);
    const oneUnit = new Set(rows.map((row) => isCageUnit(row.unitName) ? "cage" : row.unitId)).size === 1, first = rows[0];
    // `perCage`: how many of `unit` one cage makes; null when that is not known.
    let unit: string, need: number, perCage: number | null;
    if (oneUnit && isCageUnit(first.unitName)) { unit = first.unitName; need = remaining; perCage = 1; }
    else if (oneUnit && first.factor > 0) { unit = first.unitName; need = remaining; perCage = kgOfCage && kgOfCage / first.factor; }
    else { unit = "kg"; need = rows.reduce((sum, row) => sum + row.remaining * row.factor, 0); perCage = kgOfCage; }
    const planned = perCage == null ? null : round1(cages * perCage), gap = planned == null ? null : round1(planned - round1(need));
    const state: CoverageState = gap == null ? "unknown" : gap === 0 ? "enough" : gap < 0 ? "short" : "over";
    return { productId, productName, unit, need: round1(need), planned, gap, state, cagesShort: state === "short" && gap != null && perCage ? Math.ceil(-gap / perCage) : 0 };
  }).sort((a, b) => a.productName.localeCompare(b.productName, "vi"));
}

const quantityFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
export const coverageQuantity = (value: number, unit: string) => `${quantityFormat.format(value)} ${unit}`;
/** "Đủ", "Thiếu 40 Lồng" or "Dư 10 Lồng"; "Chưa quy đổi được" when the cages cannot be turned into the unit of the orders. */
export function coverageText(row: CoverageRow): string {
  if (row.state === "unknown" || row.gap == null) return "Chưa quy đổi được";
  return row.state === "enough" ? "Đủ" : `${row.state === "short" ? "Thiếu" : "Dư"} ${coverageQuantity(Math.abs(row.gap), row.unit)}`;
}
/** What the plan still lacks of the orders, as "40 Lồng Hàu béo, 10 kg Cá"; undefined when nothing is short. */
export const shortageText = (rows: readonly CoverageRow[]) => {
  const short = rows.filter((row) => row.state === "short" && row.gap != null).map((row) => `${coverageQuantity(-(row.gap ?? 0), row.unit)} ${row.productName}`);
  return short.length ? short.join(", ") : undefined;
};

/** The cages the lines expect of each product (the product of the raft of each line), leaving out the line `except`. */
export function plannedCages(lines: readonly FormLine[], productOf: (raftId: string) => string | undefined, except?: string): Map<string, number> {
  const total = new Map<string, number>();
  for (const line of lines) {
    const product = line.key === except ? undefined : productOf(line.raftId), cages = cageCount(line.cages);
    if (product && cages) total.set(product, (total.get(product) ?? 0) + cages);
  }
  return total;
}

const cageCount = (value: string) => { const parsed = Number(value.trim()); return value.trim() && Number.isInteger(parsed) && parsed > 0 ? parsed : null; };

/** The first thing wrong with the form, in the user's words; undefined when it can be sent. */
export function planFormProblem(form: PlanForm): string | undefined {
  if (!form.plannedAt) return "Chọn thời gian dự kiến.";
  if (!form.lines.length) return "Thêm ít nhất một dòng bè.";
  const rafts = new Set<string>();
  for (const [index, line] of form.lines.entries()) {
    const position = index + 1;
    if (!line.zoneId) return `Dòng ${position}: chọn vùng.`;
    if (!line.raftId) return `Dòng ${position}: chọn bè.`;
    // One raft is one line (one lot): its lanes are chosen together.
    if (rafts.has(line.raftId)) return `Dòng ${position}: bè đã có ở dòng khác của kế hoạch.`;
    rafts.add(line.raftId);
    if (!line.laneNumbers.length) return `Dòng ${position}: chọn ít nhất một luống.`;
    if (line.cages.trim() && !cageCount(line.cages)) return `Dòng ${position}: lồng dự kiến phải là số nguyên lớn hơn 0.`;
  }
  return undefined;
}

/** The JSON body of a save. Lines of an existing plan carry their id so the API keeps the lot and the lanes already skipped. */
export function buildPlanBody(form: PlanForm) {
  return {
    code: form.code.trim() || null, plannedAt: toInstant(form.plannedAt), note: form.note.trim() || null, salesOrderIds: form.orderIds,
    lines: form.lines.map((line) => ({
      ...(line.id ? { id: line.id } : {}), raftId: line.raftId, laneNumbers: [...line.laneNumbers].sort((a, b) => a - b),
      expectedCageCount: cageCount(line.cages), note: line.note.trim() || null,
    })),
    ...(form.rowVersion ? { rowVersion: form.rowVersion } : {}),
  };
}

/** The lanes of an eligible raft a plan can take: free ones, and the ones already on this plan (`ownPlanCode`) or already chosen on the form. */
export const laneSelectable = (lane: EligibleLane, ownPlanCode: string | undefined, chosen: readonly number[]) =>
  chosen.includes(lane.laneNumber) || lane.state === "Free" || lane.state === "InAnotherPlan" && !!ownPlanCode && lane.planCode === ownPlanCode;

/** What the harvest form needs of a plan line: the lanes to lock (planned ones only) and what the line expects, to start the product line from. */
export const harvestPlanFor = (plan: Pick<PlanView, "code">, line: PlanLine) => ({
  lineId: line.id, planCode: plan.code, raftId: line.raftId, raftCode: line.raftCode, laneNumbers: plannedLaneNumbers(line),
  expectedProductId: line.expectedProduct?.id, expectedCageCount: line.expectedCageCount ?? undefined,
});
export type HarvestPlanTarget = ReturnType<typeof harvestPlanFor>;
