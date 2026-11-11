"use client";
import { Button } from "@/components/ui/button";
import { Note } from "@/features/operations/ui";
import type { FarmingProblem } from "./farming-problem";

const kg = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/** True when the failed write is the over-plan question (409 MSG-GEN-04 with confirmFlag confirmOverPlan), not an error. */
export const isOverPlanQuestion = (failure: { httpStatus: number; problem?: FarmingProblem } | undefined): failure is { httpStatus: number; problem: FarmingProblem } =>
  failure?.httpStatus === 409 && failure.problem?.confirmFlag === "confirmOverPlan";

/**
 * In-form confirmation (not a pop-up) of a write that takes the cycle over 110% of its plan: the reason is required,
 * the first button goes back to editing and the second sends the same form again with confirmOverPlan and the reason.
 * Harvest words it from the backend numbers (kg); seeding passes its own `message`.
 */
export function OverPlanConfirm({ problem, message, reason, onReason, onConfirm, onDismiss, pending, dismissLabel = "Bỏ qua", confirmLabel = "Xác nhận" }: { problem?: FarmingProblem; message?: string; reason: string; onReason(value: string): void; onConfirm(): void; onDismiss(): void; pending: boolean; dismissLabel?: string; confirmLabel?: string }) {
  const totalKg = problem?.totalKg, targetYieldKg = problem?.targetYieldKg, overPlanPercent = problem?.overPlanPercent;
  return <section role="alert" aria-label="Xác nhận vượt kế hoạch" className="my-4 grid gap-3 rounded-control border border-warning/30 bg-warning-soft p-3 text-sm">
    <p><strong>Vượt kế hoạch.</strong>{" "}
      {message ?? (typeof totalKg === "number" && typeof targetYieldKg === "number"
        ? `Cộng chuyến này, chu kỳ có ${kg(totalKg)} kg ước tính, vượt mục tiêu ${kg(targetYieldKg)} kg${typeof overPlanPercent === "number" ? ` (+${kg(overPlanPercent)}%)` : ""}.`
        : "Cộng chuyến này, chu kỳ vượt mục tiêu sản lượng.")} Việc này được ghi vào nhật ký.</p>
    <Note label="Lý do vượt kế hoạch *" required maxLength={1000} value={reason} disabled={pending} onChange={event => onReason(event.target.value)} />
    <div className="flex flex-wrap justify-end gap-2">
      <Button key="over-plan-dismiss" type="button" className="w-auto" variant="secondary" disabled={pending} onClick={onDismiss}>{dismissLabel}</Button>
      <Button key="over-plan-confirm" type="button" className="w-auto" isPending={pending} disabled={!reason.trim()} onClick={onConfirm}>{confirmLabel}</Button>
    </div>
  </section>;
}
