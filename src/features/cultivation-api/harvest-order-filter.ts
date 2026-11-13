import type { z } from "zod";
import { farmingFieldError, type FarmingProblem } from "./farming-problem";
import type { harvestOrder } from "./records-contracts";

type Order = z.infer<typeof harvestOrder>;
type CycleProduct = { productId?: string | null; productName?: string | null } | null | undefined;

export type HarvestOrderView = {
  /** Name of the product the raft farms, when known; null for a legacy cycle without a product. */
  productName: string | null;
  /** True when the product rule applies (the cycle farms a known product); false for a legacy cycle: nothing is filtered and no banner shows. */
  filtering: boolean;
  /** Orders a trip can be recorded for: they match the farmed product. */
  selectable: Order[];
  /** Orders for another product, each with the reason; shown only on request and never selectable. */
  mismatched: { order: Order; reason: string }[];
};

/** The harvest read in the words of this module: the farmed product is at screen level (`cycleProductId/Name`), with the cycle summary as a fallback. */
type HarvestRead = { cycle?: CycleProduct; cycleProductId?: string | null; cycleProductName?: string | null; orders?: readonly Order[] | null };
export const splitHarvestRead = (data: HarvestRead) =>
  splitHarvestOrders({ productId: data.cycleProductId ?? data.cycle?.productId, productName: data.cycleProductName ?? data.cycle?.productName }, data.orders ?? []);

/** Does the order ask for the farmed product? The backend flag decides; without it (older backend) ids are compared, and with neither the order stays selectable. */
function matchesProduct(order: Order, cycle: CycleProduct): boolean {
  if (order.matchesCycleProduct != null) return order.matchesCycleProduct;
  return cycle?.productId && order.productId ? cycle.productId === order.productId : true;
}

/**
 * The message at the purchase request field after the backend refused the trip: 400 HARVEST_PRODUCT_MISMATCH carries a Vietnamese detail that is shown as sent
 * (the order was for another product than the raft farms); any other refusal naming the request field keeps its hint.
 */
export function harvestOrderError(problem: FarmingProblem | undefined): string | undefined {
  if ([problem?.code, problem?.reasonCode].includes("HARVEST_PRODUCT_MISMATCH")) {
    const text = problem?.hint ?? problem?.message ?? problem?.detail;
    return text && /[À-ỹ]/.test(text) ? text : "Đơn mua không khớp loại hàu đang nuôi của bè. Hãy chọn đơn đúng loại hàu.";
  }
  return farmingFieldError(problem, "Purchase request", "PurchaseRequestId");
}

/** "Đơn đặt Hàu gầy 3cm nhưng bè đang nuôi Hàu múp": why an order cannot be harvested on this raft. */
export const mismatchReason = (order: Pick<Order, "productName">, farmed: string | null) =>
  `Đơn đặt ${order.productName} nhưng bè đang nuôi ${farmed ?? "loại hàu khác"}`;

/**
 * Splits the purchase requests of the harvest screen by the product the cycle farms (owner rule 13/11/2026: the request must match the farmed oyster, a customer
 * who ordered Hàu múp must not get a harvest of Hàu gầy 3cm). The farmed product name comes from the cycle, else from a matching order.
 */
export function splitHarvestOrders(cycle: CycleProduct, orders: readonly Order[]): HarvestOrderView {
  const flagged = orders.some(order => order.matchesCycleProduct != null);
  const productName = cycle?.productName ?? orders.find(order => order.matchesCycleProduct === true)?.productName ?? null;
  const filtering = !!(cycle?.productId || cycle?.productName || flagged);
  if (!filtering) return { productName, filtering: false, selectable: [...orders], mismatched: [] };
  const selectable = orders.filter(order => matchesProduct(order, cycle));
  return { productName, filtering: true, selectable, mismatched: orders.filter(order => !selectable.includes(order)).map(order => ({ order, reason: mismatchReason(order, productName) })) };
}
