"use client";
import { StatusPill } from "@/components/ui/management-page";
import type { StaffingSummary } from "./contracts";
import { hasStaffing, planWaitsForPeople, staffingChipText } from "./plan-roster-logic";

/** "Đã xác nhận 3/5" for a plan still waiting for its people: amber while short, green when enough, grey without a number needed. Nothing for other plans. */
export function PlanStaffingChip({ statusId, staffing }: { statusId: number; staffing?: StaffingSummary | null }) {
  if (!planWaitsForPeople(statusId) || !hasStaffing(staffing)) return null;
  const tone = staffing.requiredPeople == null ? "neutral" : staffing.missing > 0 ? "warning" : "success";
  return <StatusPill tone={tone}>{staffingChipText(staffing)}</StatusPill>;
}
