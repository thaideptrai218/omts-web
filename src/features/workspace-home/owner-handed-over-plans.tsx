"use client";
import { useCallback } from "react";
import { PLAN, type PlanRow } from "@/features/harvest-plans/contracts";
import { planHref } from "@/features/harvest-plans/plan-labels";
import { planRepository } from "@/features/harvest-plans/repository";
import { useRemote } from "@/features/operations/ui";
import { viDateTime } from "@/features/purchase-documents/document-parts";
import { HomeBlock } from "./home-block";

/** Trang nhỏ nhất BFF nhận cho danh sách kế hoạch (15/30/50/100). */
const PAGE_SIZE = "15";

/**
 * Kế hoạch chờ Chủ bấm Hoàn thành: quản lý vùng đã bàn giao, hoặc kế hoạch chủ tự làm đã có đủ lô cho mọi bè (đang thu, mọi dòng đã xong).
 * Chủ tự làm không qua nhận hay bàn giao nên chỉ tính khi đủ lô.
 */
export const waitingForOwner = (row: Pick<PlanRow, "statusId" | "executor" | "progress">) =>
  row.statusId === PLAN.handedOver || row.statusId === PLAN.harvesting && row.executor === "Owner" && row.progress.lines > 0 && row.progress.linesDone >= row.progress.lines;

/** "Chờ chủ hoàn tất" của Chủ HTX. */
export function OwnerHandedOverPlans() {
  const remote = useRemote(useCallback((signal: AbortSignal) => planRepository.list({ statusIds: `${PLAN.handedOver},${PLAN.harvesting}`, page: "1", pageSize: PAGE_SIZE }, signal), []));
  return <HomeBlock title="Chờ chủ hoàn tất" remote={remote} moreHref="/farming/harvest-plans" empty="Không có kế hoạch thu hoạch nào chờ bạn hoàn tất."
    rows={(page) => page.items.filter(waitingForOwner).map((plan) => ({ key: plan.id, title: plan.code, detail: `${plan.executor === "Owner" ? "Chủ tự làm, đã đủ lô" : "Quản lý vùng đã bàn giao"} · dự kiến ${viDateTime(plan.plannedAt)}`, href: planHref(plan.code) }))} />;
}
