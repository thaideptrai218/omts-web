"use client";
import { useCallback, useMemo } from "react";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { useRemote } from "@/features/operations/ui";
import { ORDER, type OrderView } from "@/features/sales-orders/contracts";
import { orderRepository } from "@/features/sales-orders/repository";
import type { OrderNeedLine } from "./plan-logic";

/**
 * The lines of the orders linked to a plan, read from each order. `needs` holds the lines of the orders still open (Phiếu tạm or Đang giao), which is what the plan
 * has to cover; `byOrder` holds the lines of every linked order for display. While the orders load `loading` is true; a failed read is `error`.
 */
export function useOrderNeeds(orderIds: readonly string[]) {
  const key = orderIds.join(",");
  const remote = useRemote<Map<string, OrderView>>(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<Map<string, OrderView>>> => {
    const orders = new Map<string, OrderView>();
    const ids = key ? key.split(",") : [];
    const results = await Promise.all(ids.map((id) => orderRepository.detail(id, signal)));
    for (const [index, result] of results.entries()) {
      if (result.status !== "success") return result;
      orders.set(ids[index], result.data);
    }
    return { status: "success", data: orders };
  }, [key]));
  const needs = useMemo<OrderNeedLine[]>(() => [...(remote.data?.values() ?? [])]
    .filter((order) => order.statusId === ORDER.draft || order.statusId === ORDER.delivering)
    .flatMap((order) => order.lines.map((line) => ({ productId: line.productId, productName: line.productName, unitId: line.unitId, unitName: line.unitName, factor: line.factor, quantity: line.quantity, deliveredQuantity: line.deliveredQuantity }))), [remote.data]);
  return { needs, byOrder: remote.data, loading: !!key && remote.loading, error: key ? remote.error : undefined, reload: remote.reload };
}
