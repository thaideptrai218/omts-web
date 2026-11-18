import { toInstant } from "@/features/sales-orders/order-logic";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import type { PlanLane, PlanLine, PlanView } from "./contracts";
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
/** A line (a raft) can be harvested now when the API allows it and it has no lot yet; lanes are no longer planned. */
export const lineCanHarvest = (line: Pick<PlanLine, "lot" | "canHarvest">) => line.canHarvest && !line.lot;

/** The totals of a plan by raft line: rafts, expected cages, lines with a lot. */
export function planTotals(lines: readonly PlanLine[]) {
  const cages = lines.some((line) => line.expectedCageCount != null) ? lines.reduce((sum, line) => sum + (line.expectedCageCount ?? 0), 0) : null;
  return { rafts: new Set(lines.map((line) => line.raftId)).size, cages, lots: lines.filter((line) => line.lot).length, lines: lines.length };
}

/**
 * One line of the form: a zone and one raft of it (no lanes are planned) with its expected cages. The zone only narrows the choice of raft (the API takes the zone from the raft); the
 * product is the one the raft farms and is never typed. A line with a lot or a skipped lane cannot be changed once the plan is given out.
 */
export type FormLine = { key: string; id?: string; zoneId: string; raftId: string; cages: string; note: string; locked: boolean };
export type PlanForm = { code: string; plannedAt: string; note: string; orderIds: string[]; lines: FormLine[]; rowVersion?: string };

export const blankFormLine = (zoneId = ""): FormLine => ({ key: crypto.randomUUID(), zoneId, raftId: "", cages: "", note: "", locked: false });

export function formLineOf(line: PlanLine, givenOut: boolean): FormLine {
  return {
    key: crypto.randomUUID(), id: line.id, zoneId: line.zone.id, raftId: line.raftId,
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
export type CoverageRow = {
  productId: string; productName: string; unit: string; need: number; planned: number | null; gap: number | null; state: CoverageState; cagesShort: number;
  /** How many of `unit` one cage makes (1 when the unit is the cage) and the kg of one cage; null when not known. They turn a quantity of `unit` into cages and cages into kg. */
  perCage: number | null; kgPerCage: number | null;
};

const round1 = (value: number) => Math.round(value * 10) / 10;
/** What one cage (Lồng) weighs when neither the order lines nor the harvest settings say: the factor of the Lồng unit products are created with (Lồng = 50 kg). */
export const DEFAULT_KG_PER_CAGE = 50;
const KG_PER_TON = 1000;
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
    // The kg of one cage of this product: the factor of a Lồng line of the orders, else the one given.
    const cageLine = rows.find((row) => isCageUnit(row.unitName) && row.factor > 0), cageKg = cageLine?.factor ?? kgOfCage;
    // `perCage`: how many of `unit` one cage makes; null when that is not known.
    let unit: string, need: number, perCage: number | null;
    if (oneUnit && isCageUnit(first.unitName)) { unit = first.unitName; need = remaining; perCage = 1; }
    else if (oneUnit && first.factor > 0) { unit = first.unitName; need = remaining; perCage = cageKg && cageKg / first.factor; }
    else { unit = "kg"; need = rows.reduce((sum, row) => sum + row.remaining * row.factor, 0); perCage = cageKg; }
    const planned = perCage == null ? null : round1(cages * perCage), gap = planned == null ? null : round1(planned - round1(need));
    const state: CoverageState = gap == null ? "unknown" : gap === 0 ? "enough" : gap < 0 ? "short" : "over";
    return { productId, productName, unit, need: round1(need), planned, gap, state, cagesShort: state === "short" && gap != null && perCage ? Math.ceil(-gap / perCage) : 0, perCage, kgPerCage: cageKg ?? null };
  }).sort((a, b) => a.productName.localeCompare(b.productName, "vi"));
}

const quantityFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
export const coverageQuantity = (value: number, unit: string) => `${quantityFormat.format(value)} ${unit}`;
/** "72 Lồng (≈ 3,6 tấn)" or "3 Tấn (≈ 60 lồng)": a quantity in the unit of the orders with its equivalent in the other unit, so the office reads it in tons and the crew follows it by cages. */
export function coverageQuantityWithEquivalent(row: CoverageRow, value: number): string {
  const main = coverageQuantity(value, row.unit);
  if (isCageUnit(row.unit)) return row.kgPerCage ? `${main} (≈ ${weightText(value * row.kgPerCage)})` : main;
  return row.perCage ? `${main} (≈ ${quantityFormat.format(round1(value / row.perCage))} lồng)` : main;
}
/** The weight of some cages, "≈ 250 kg" or "≈ 2,5 tấn"; empty when the kg of a cage is not known. */
export const cageWeightText = (cages: number, kgPerCage?: number | null) => kgPerCage && kgPerCage > 0 && cages > 0 ? `≈ ${weightText(cages * kgPerCage)}` : "";
function weightText(kg: number) { return kg >= KG_PER_TON ? `${quantityFormat.format(round1(kg / KG_PER_TON))} tấn` : `${quantityFormat.format(round1(kg))} kg`; }
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

/** Cages typed with a comma or a point: above 0, at most 100.000 and at most 2 decimals (0,5 is half a cage), otherwise null. */
export const cageCount = (value: string) => { const parsed = Number(value.trim().replace(",", ".")); return value.trim() && Number.isFinite(parsed) && parsed > 0 && parsed <= 100_000 && Math.abs(parsed * 100 - Math.round(parsed * 100)) < 1e-6 ? parsed : null; };

/** The first thing wrong with the form, in the user's words; undefined when it can be sent. */
export function planFormProblem(form: PlanForm): string | undefined {
  if (!form.plannedAt) return "Chọn thời gian dự kiến.";
  // A plan is made for sales orders (MSG-PLAN-07): one plan may serve many orders, never none.
  if (!form.orderIds.length) return "Chọn ít nhất một đơn đặt hàng cho kế hoạch thu hoạch.";
  if (!form.lines.length) return "Thêm ít nhất một dòng bè.";
  const rafts = new Set<string>();
  for (const [index, line] of form.lines.entries()) {
    const position = index + 1;
    if (!line.zoneId) return `Dòng ${position}: chọn vùng.`;
    if (!line.raftId) return `Dòng ${position}: chọn bè.`;
    // One raft is one line (one lot).
    if (rafts.has(line.raftId)) return `Dòng ${position}: bè đã có ở dòng khác của kế hoạch.`;
    rafts.add(line.raftId);
    if (line.cages.trim() && !cageCount(line.cages)) return `Dòng ${position}: lồng dự kiến phải lớn hơn 0 và có tối đa 2 số lẻ (được nhập 0,5).`;
  }
  return undefined;
}

/** The JSON body of a save. Lines of an existing plan carry their id so the API keeps the lot and the lanes an older plan has (an empty `laneNumbers` leaves them as they are). */
export function buildPlanBody(form: PlanForm) {
  return {
    code: form.code.trim() || null, plannedAt: toInstant(form.plannedAt), note: form.note.trim() || null, salesOrderIds: form.orderIds,
    lines: form.lines.map((line) => ({
      ...(line.id ? { id: line.id } : {}), raftId: line.raftId, laneNumbers: [],
      expectedCageCount: cageCount(line.cages), note: line.note.trim() || null,
    })),
    ...(form.rowVersion ? { rowVersion: form.rowVersion } : {}),
  };
}

/** What the harvest form needs of a plan line: the lanes to lock (planned ones only) and what the line expects, to start the product line from. */
export const harvestPlanFor = (plan: Pick<PlanView, "code">, line: PlanLine) => ({
  lineId: line.id, planCode: plan.code, raftId: line.raftId, raftCode: line.raftCode, laneNumbers: plannedLaneNumbers(line),
  expectedProductId: line.expectedProduct?.id, expectedCageCount: line.expectedCageCount ?? undefined,
});
export type HarvestPlanTarget = ReturnType<typeof harvestPlanFor>;
