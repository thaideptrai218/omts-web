"use client";
import Link from "next/link";
import { Children, useCallback, useState, type ReactNode } from "react";
import { StatusPill } from "@/components/ui/management-page";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { PlanBar } from "@/features/farming-management/plan-bar";
import { businessToday, Skeleton, useRemote } from "@/features/operations/ui";
import { cycleProgress } from "./contracts";
import { CycleClosePanel } from "./cycle-close-panel";
import { buildJourney, currentStep, statusLabel, type JourneyAction, type JourneyStep } from "./cycle-journey-model";
import type { CycleAccess } from "./cycle-plan-tab";
import type { CycleRow } from "./cycle-model";
import { readCycles, readCycleSummary } from "./repository";

const linkAction = "inline-flex min-h-[30px] items-center rounded-control border border-primary bg-primary px-3 py-1 text-[13px] font-medium text-white hover:bg-primary-hover";

/** "Hành trình": Kế hoạch → Thả giống → Chăm sóc → Thu hoạch → Tổng kết, each with plan vs actual, a status and one next action. */
export function CycleJourneyTab({ row, zoneId, access, onJump, onChanged }: { row: CycleRow; zoneId: string; access: CycleAccess; onJump(tab: "plan" | "logs"): void; onChanged(notice: string): void }) {
  const cycleId = row.cycle?.id ?? "";
  const progress = useRemote(useCallback((signal: AbortSignal) => cycleId ? readCycles({ action: "progress", raftId: row.raftId, cycleId }, cycleProgress, signal) : Promise.resolve({ status: "success" as const, data: undefined }), [row.raftId, cycleId]));
  const summary = useRemote(useCallback((signal: AbortSignal) => cycleId ? readCycleSummary(cycleId, signal) : Promise.resolve({ status: "success" as const, data: undefined }), [cycleId]));
  const [closing, setClosing] = useState(false);
  if (!row.cycle) return <p className="text-sm text-text-muted">Bè chưa có chu kỳ nuôi. Bắt đầu chu kỳ để theo dõi hành trình từ kế hoạch đến tổng kết.</p>;
  if (progress.loading || summary.loading) return <Skeleton />;
  const cycle = progress.data?.cycle, figures = summary.data;
  if (progress.error || summary.error || !cycle || !figures) return <ListStateMessage error={progress.error ?? summary.error ?? "Không tải được hành trình chu kỳ."} onRetry={() => { progress.reload(); summary.reload(); }} retryLabel="Tải lại hành trình" />;
  const canRecord = access.view && !cycle.closeDate;
  const steps = buildJourney({ cycle, lanes: progress.data!.lanes, figures, today: businessToday(), canClose: access.edit && cycle.canEdit, canEditPlan: access.edit && cycle.canEdit, canLog: access.logsCreate, canRecord });
  const current = currentStep(steps);
  const act = (action: JourneyAction) => action.close ? setClosing(true) : action.tab ? onJump(action.tab) : undefined;
  return <ol aria-label="Hành trình chu kỳ" className="grid gap-3">
    {steps.map((step, index) => <StepCard key={step.key} step={step} index={index + 1} current={step.key === current}>
      {step.action && (step.action.screen
        ? <Link key={step.action.key} className={linkAction} href={farmingReferenceHref(step.action.screen, { zoneId, raftId: row.raftId, cycleId })}>{step.action.label}</Link>
        : !step.action.close || !closing ? <button key={step.action.key} type="button" className={linkAction} onClick={() => act(step.action!)}>{step.action.label}</button> : null)}
      {step.key === "summary" && closing && <CycleClosePanel cycleId={cycleId} raftCode={row.raftCode} onDismiss={() => setClosing(false)} onClosed={() => { setClosing(false); onChanged("Đã kết thúc chu kỳ."); }} />}
    </StepCard>)}
  </ol>;
}

function StepCard({ step, index, current, children }: { step: JourneyStep; index: number; current: boolean; children: ReactNode }) {
  return <li aria-current={current ? "step" : undefined} className={`relative grid gap-2 rounded-control border bg-surface p-3 ${current ? "border-primary" : "border-border"}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="flex items-center gap-2 text-sm font-semibold"><span aria-hidden className={`grid size-6 place-items-center rounded-full text-xs ${step.status === "done" ? "bg-primary text-white" : "bg-surface-subtle"}`}>{step.status === "done" ? "✓" : index}</span>{step.label}</h4>
      <span className="flex items-center gap-2 text-xs text-text-muted"><StatusPill tone={step.status === "done" ? "success" : "neutral"}>{statusLabel[step.status]}</StatusPill>{step.chip}</span>
    </div>
    {step.bars.map(bar => <PlanBar key={bar.label} {...bar} />)}
    {step.lines.length > 0 && <ul className="grid gap-0.5 text-xs text-text-muted">{step.lines.map(line => <li key={line}>{line}</li>)}</ul>}
    {Children.toArray(children).length > 0 && <div className="flex flex-wrap justify-end gap-2">{children}</div>}
  </li>;
}
