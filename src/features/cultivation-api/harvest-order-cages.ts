import type { z } from "zod";
import type { FarmingProblem } from "./farming-problem";
import type { harvestOrder, harvestSaved } from "./records-contracts";

/**
 * The cages of a harvest trip match the purchase request (owner decision 13/11/2026): the lots of an order never add up to more than it accepted,
 * so a trip for it defaults to what is left and is capped there. The default is only a suggestion: an order is often gathered from several rafts (any zone) of the same
 * oyster, so the user lowers the cages to what this raft gives. An order with no accepted cages (older data) is not capped.
 */
type Order = Pick<z.infer<typeof harvestOrder>, "acceptedCages" | "harvestedCages">;
type Saved = Pick<z.infer<typeof harvestSaved>, "orderCagesTotal" | "orderCagesHarvested" | "orderComplete"> & { lot: { purchaseRequestCode?: string | null } };

export const HARVEST_ORDER_CAGES_EXCEEDED = "HARVEST_ORDER_CAGES_EXCEEDED";
const round2 = (value: number) => Math.round(value * 100) / 100;
const vn = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/** Cages still to harvest for the order (accepted minus harvested, never below 0); undefined when the order accepted no cages to compare with. */
export function orderRemainingCages(order: Order | undefined): number | undefined {
  if (!order || !(order.acceptedCages > 0)) return undefined;
  return Math.max(0, round2(order.acceptedCages - order.harvestedCages));
}

/** "Đã thu 10/15 lồng · còn 5 lồng" for the picker. */
export function orderProgressText(order: Order): string {
  const left = orderRemainingCages(order);
  return `Đã thu ${vn(order.harvestedCages)}/${vn(order.acceptedCages)} lồng${left === undefined ? "" : ` · còn ${vn(left)} lồng`}`;
}

/** What "Số lồng thu hoạch" shows for the picked order until the user types: the remaining cages in machine format ("5", "5.5"), or empty when none are known or left. */
export function defaultCagesText(order: Order | undefined): string {
  const left = orderRemainingCages(order);
  return left ? String(left) : "";
}

/** The refusal shown at the cages field when the typed cages go over what the order has left; undefined when they fit (or cannot be read yet). */
export function cagesOverOrderProblem(order: Order | undefined, cagesText: string): string | undefined {
  const left = orderRemainingCages(order);
  const cages = Number(cagesText.trim().replace(",", "."));
  if (!order || left === undefined || !cagesText.trim() || !Number.isFinite(cages) || cages <= left + 1e-9) return undefined;
  return `Đơn này chỉ còn ${vn(left)} lồng (đã thu ${vn(order.harvestedCages)}/${vn(order.acceptedCages)}). Số lồng phải khớp với đơn mua.`;
}

/** 400 HARVEST_ORDER_CAGES_EXCEEDED (field CageCount) shown at the cages field with the backend's Vietnamese detail, else a fixed sentence. */
export function harvestCagesError(problem: FarmingProblem | undefined): string | undefined {
  if (!problem || ![problem.code, problem.reasonCode].includes(HARVEST_ORDER_CAGES_EXCEEDED)) return undefined;
  const text = problem.hint ?? problem.message ?? problem.detail;
  return text && /[À-ỹ]/.test(text) ? text : "Số lồng thu hoạch vượt số lồng còn lại của đơn mua. Số lồng phải khớp với đơn mua.";
}

/**
 * What the saved trip says about its order: "Đơn YC-1 đã thu đủ 15/15 lồng." when it brought the order to its accepted cages, else (cages still left) "Còn 5 lồng của đơn YC-1
 * cần thu ở bè khác cùng loại hàu"; undefined when the backend sent no figures (older backend).
 */
export function orderCompleteText(saved: Saved, fallbackCode: string | undefined, fallbackTotal: number | undefined): { complete: boolean; text: string } | undefined {
  const total = saved.orderCagesTotal ?? fallbackTotal, code = saved.lot.purchaseRequestCode ?? fallbackCode, label = `đơn${code ? ` ${code}` : ""}`;
  if (saved.orderComplete) return total ? { complete: true, text: `Đơn${code ? ` ${code}` : ""} đã thu đủ ${vn(total)}/${vn(total)} lồng.` } : undefined;
  const left = total && saved.orderCagesHarvested != null ? round2(total - saved.orderCagesHarvested) : 0;
  return left > 0 ? { complete: false, text: `Còn ${vn(left)} lồng của ${label} cần thu ở bè khác cùng loại hàu.` } : undefined;
}

/** "Đã thu 5/10 lồng: B1-06 (DEMO-01) 5 lồng; …": where the earlier cages of the order came from (every raft and zone). Undefined when nothing was harvested yet. */
export function orderTripsText(order: Pick<z.infer<typeof harvestOrder>, "trips">): string | undefined {
  const trips = order.trips ?? [];
  return trips.length ? trips.map(trip => `${trip.raftCode}${trip.zoneCode ? ` (${trip.zoneCode})` : ""} ${vn(trip.cages)} lồng`).join("; ") : undefined;
}

/** The line under the order picker: the cages are only a suggestion, the rest of the order is harvested on another raft of the same oyster. */
export function orderGatherHint(order: Order | undefined): string | undefined {
  const left = orderRemainingCages(order);
  if (left === undefined) return undefined;
  return `Đơn còn ${vn(left)} lồng. Nhập số lồng thu được từ bè này; phần còn lại thu ở bè khác cùng loại hàu.`;
}
