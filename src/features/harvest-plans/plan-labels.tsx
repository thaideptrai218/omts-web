"use client";
import { StatusPill } from "@/components/ui/management-page";
import { PLAN } from "./contracts";

export const PLANS_PATH = "/farming/harvest-plans";
/** A plan is opened in its list by its code. */
export const planHref = (code: string) => `${PLANS_PATH}?code=${encodeURIComponent(code)}`;
/** The editor of a new plan made for one or more orders. */
export const newPlanHref = (orderIds: readonly string[]) => orderIds.length ? `${PLANS_PATH}/new?${orderIds.map((id) => `order=${encodeURIComponent(id)}`).join("&")}` : `${PLANS_PATH}/new`;
export const planStatusLabel: Record<number, string> = { 4201: "Phiếu tạm", 4202: "Đã giao QLV", 4203: "Đang thu", 4204: "Hoàn thành", 4205: "Đã hủy" };
export const allPlanStatuses = [PLAN.draft, PLAN.assigned, PLAN.harvesting, PLAN.completed, PLAN.cancelled];

const tone = (statusId: number) => statusId === PLAN.completed ? "success" as const : statusId === PLAN.cancelled ? "danger" as const : "neutral" as const;
export function PlanStatus({ statusId }: { statusId: number }) {
  return <StatusPill tone={tone(statusId)}>{planStatusLabel[statusId] ?? ""}</StatusPill>;
}
