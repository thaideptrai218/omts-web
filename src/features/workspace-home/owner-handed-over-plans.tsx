"use client";
import { useCallback } from "react";
import { PLAN } from "@/features/harvest-plans/contracts";
import { planHref } from "@/features/harvest-plans/plan-labels";
import { planRepository } from "@/features/harvest-plans/repository";
import { useRemote } from "@/features/operations/ui";
import { viDateTime } from "@/features/purchase-documents/document-parts";
import { HomeBlock } from "./home-block";

/** Trang nhỏ nhất BFF nhận cho danh sách kế hoạch (15/30/50/100). */
const PAGE_SIZE = "15";

/** "Chờ chủ hoàn tất" của Chủ HTX: kế hoạch thu hoạch quản lý vùng đã bàn giao, chờ kiểm tra rồi bấm Hoàn thành. */
export function OwnerHandedOverPlans() {
  const remote = useRemote(useCallback((signal: AbortSignal) => planRepository.list({ statusIds: String(PLAN.handedOver), page: "1", pageSize: PAGE_SIZE }, signal), []));
  return <HomeBlock title="Chờ chủ hoàn tất" remote={remote} moreHref="/farming/harvest-plans" empty="Không có kế hoạch thu hoạch nào chờ bạn hoàn tất."
    rows={(page) => page.items.map((plan) => ({ key: plan.id, title: plan.code, detail: `Quản lý vùng đã bàn giao · dự kiến ${viDateTime(plan.plannedAt)}`, href: planHref(plan.code) }))} />;
}
