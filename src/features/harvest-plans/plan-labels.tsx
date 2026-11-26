"use client";
import { StatusPill } from "@/components/ui/management-page";
import { PLAN, type PlanExecutor } from "./contracts";

export const PLANS_PATH = "/farming/harvest-plans";
/** A plan is opened in its list by its code. */
export const planHref = (code: string) => `${PLANS_PATH}?code=${encodeURIComponent(code)}`;
/** The editor of a new plan made for one or more orders. */
export const newPlanHref = (orderIds: readonly string[]) => orderIds.length ? `${PLANS_PATH}/new?${orderIds.map((id) => `order=${encodeURIComponent(id)}`).join("&")}` : `${PLANS_PATH}/new`;
export const planStatusLabel: Record<number, string> = { 4201: "Phiếu tạm", 4202: "Đã phân công", 4206: "Đã nhận", 4203: "Đang thu", 4207: "Đã bàn giao", 4204: "Hoàn thành", 4205: "Đã hủy" };
/** In the order of the flow: Draft, Assigned, Received, Harvesting, HandedOver, Completed, Cancelled. */
export const allPlanStatuses = [PLAN.draft, PLAN.assigned, PLAN.received, PLAN.harvesting, PLAN.handedOver, PLAN.completed, PLAN.cancelled];

/** One colour per status so the stage of a plan reads at a glance, never by colour alone (the label is always shown). */
export const planStatusTone: Record<number, "neutral" | "info" | "primary" | "indigo" | "warning" | "success" | "danger"> = {
  [PLAN.draft]: "neutral", [PLAN.assigned]: "info", [PLAN.received]: "primary", [PLAN.harvesting]: "indigo", [PLAN.handedOver]: "warning", [PLAN.completed]: "success", [PLAN.cancelled]: "danger",
};
const tone = (statusId: number) => planStatusTone[statusId] ?? "neutral";
/** The label of a status for one plan: only a plan given to the zone manager says "giao QLV"; an Owner plan is simply assigned. */
export const planStatusText = (statusId: number, executor?: PlanExecutor) => statusId === PLAN.assigned && executor !== "Owner" ? "Đã giao QLV" : planStatusLabel[statusId] ?? "";
export function PlanStatus({ statusId, executor }: { statusId: number; executor?: PlanExecutor }) {
  return <StatusPill tone={tone(statusId)}>{planStatusText(statusId, executor)}</StatusPill>;
}
