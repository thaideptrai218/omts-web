"use client";
import Link from "next/link";
import { Children, useCallback, useState, type ReactNode } from "react";
import { StatusPill } from "@/components/ui/management-page";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { farmingStepLink, nurseryLink } from "@/features/farming-management/entity-links";
import { PlanBar } from "@/features/farming-management/plan-bar";
import { businessToday, Skeleton, useRemote } from "@/features/operations/ui";
import { cycleProgress } from "./contracts";
import { CycleClosePanel } from "./cycle-close-panel";
import { CycleJourneyKpiRow } from "./cycle-journey-kpi-row";
import { CycleProductLine } from "./cycle-product-line";
import { buildStripItems } from "./cycle-journey-strip-model";
import { buildJourney, currentStep, statusLabel, type JourneyAction, type JourneyStep } from "./cycle-journey-model";
import type { CycleAccess } from "./cycle-plan-tab";
import type { CycleRow } from "./cycle-model";
import { readCycles, readCycleSummary } from "./repository";

const linkAction = "inline-flex min-h-[30px] items-center rounded-control border border-primary bg-primary px-3 py-1 text-[13px] font-medium text-white hover:bg-primary-hover";

/**
 * The cycle as a progress dashboard. "overview" (tab Tổng hợp): the figures at a glance, then nursery, plan, seeding and harvest steps with plan-vs-actual bars,
 * plus the optional care and material activities. "summary" (tab Tổng kết): the closing step with its figures, the assessment and "Kết thúc chu kỳ".
 */
export function CycleJourneyTab({ part, row, zoneId, access, onJump, onChanged }: { part: "overview" | "summary"; row: CycleRow; zoneId: string; access: CycleAccess; onJump(tab: "plan" | "logs"): void; onChanged(notice: string): void }) {
  const cycleId = row.cycle?.id ?? "";
  const progress = useRemote(useCallback((signal: AbortSignal) => cycleId ? readCycles({ action: "progress", raftId: row.raftId, cycleId }, cycleProgress, signal) : Promise.resolve({ status: "success" as const, data: undefined }), [row.raftId, cycleId]));
  const summary = useRemote(useCallback((signal: AbortSignal) => cycleId ? readCycleSummary(cycleId, signal) : Promise.resolve({ status: "success" as const, data: undefined }), [cycleId]));
  const [closing, setClosing] = useState(false);
  if (!row.cycle) return <p className="text-sm text-text-muted">Bè này chưa có chu kỳ nuôi.</p>;
  if (progress.loading || summary.loading) return <Skeleton />;
  const cycle = progress.data?.cycle, figures = summary.data;
  if (progress.error || summary.error || !cycle || !figures) return <ListStateMessage error={progress.error ?? summary.error ?? "Không tải được hành trình chu kỳ."} onRetry={() => { progress.reload(); summary.reload(); }} retryLabel="Tải lại hành trình" />;
  const canRecord = access.view && !cycle.closeDate;
  const steps = buildJourney({ cycle, lanes: progress.data!.lanes, figures, today: businessToday(), canClose: access.edit && cycle.canEdit, canEditPlan: access.edit && cycle.canEdit, canLog: access.logsCreate, canRecord });
  const allMain = steps.filter(step => step.key !== "care");
  const overview = part === "overview", mainSteps = allMain.filter(step => (step.key === "summary") !== overview);
  const care = steps.find(step => step.key === "care")!;
  const current = currentStep(allMain);
  const act = (action: JourneyAction) => action.close ? setClosing(true) : action.tab ? onJump(action.tab) : undefined;
  return <>{overview && <CycleProductLine productName={cycle.productName} nurseryCode={cycle.nurseryCode} />}{overview && <CycleJourneyKpiRow items={buildStripItems({ cycle, lanes: progress.data!.lanes, figures })} />}<ol aria-label={overview ? "Hành trình chu kỳ" : "Tổng kết chu kỳ"} className="grid gap-3">
    {mainSteps.map(step => <StepCard key={step.key} id={`journey-${step.key}-${cycleId}`} step={step} index={allMain.indexOf(step) + 1} current={step.key === current}>
      {step.key === "nursery" && nurseryLink(cycle.nurseryCode, zoneId) && <Link key="view-nursery" className={linkAction} href={nurseryLink(cycle.nurseryCode, zoneId)!}>Xem đợt ươm {cycle.nurseryCode}</Link>}
      {step.action && (step.action.screen
        ? <Link key={step.action.key} className={linkAction} href={farmingStepLink(step.action.screen, { zoneId, raftId: row.raftId, cycleId })}>{step.action.label}</Link>
        : !step.action.close || !closing ? <button key={step.action.key} type="button" className={linkAction} onClick={() => act(step.action!)}>{step.action.label}</button> : null)}
      {step.key === "summary" && closing && <CycleClosePanel cycleId={cycleId} raftCode={row.raftCode} onDismiss={() => setClosing(false)} onClosed={() => { setClosing(false); onChanged("Đã kết thúc chu kỳ."); }} />}
    </StepCard>)}
  </ol>{overview && <aside aria-label="Hoạt động tùy chọn" className="mt-3 grid gap-3 rounded-control border border-dashed border-border bg-surface-subtle p-3 sm:grid-cols-2">
    <section className="space-y-2"><h4 className="text-sm font-medium">Chăm sóc <span className="ml-1 rounded-full border border-border px-2 py-0.5 text-xs font-normal text-text-muted">Tùy chọn</span></h4><p className="text-xs text-text-muted">Nhật ký chăm sóc trong suốt chu kỳ.</p>{access.logs && <button type="button" className="min-h-8 text-xs font-medium text-primary underline underline-offset-4" onClick={() => onJump("logs")}>{care.action?.label ?? "Xem nhật ký chăm sóc"}</button>}</section>
    <section className="space-y-2"><h4 className="text-sm font-medium">Vật tư <span className="ml-1 rounded-full border border-border px-2 py-0.5 text-xs font-normal text-text-muted">Tùy chọn</span></h4><p className="text-xs text-text-muted">Ghi nhận vật tư khi có nhu cầu sửa chữa bè.</p>{access.view && <Link className="inline-flex min-h-8 items-center text-xs font-medium text-primary underline underline-offset-4" href={farmingStepLink("material", { zoneId, raftId: row.raftId, cycleId })}>Sử dụng vật tư →</Link>}</section>
  </aside>}</>;
}

function StepCard({ id, step, index, current, children }: { id: string; step: JourneyStep; index: number; current: boolean; children: ReactNode }) {
  return <li id={id} aria-current={current ? "step" : undefined} className={`relative grid gap-2 rounded-control border bg-surface p-3 ${current ? "border-primary" : "border-border"}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="flex items-center gap-2 text-sm font-semibold"><span aria-hidden className={`grid size-6 place-items-center rounded-full text-xs ${step.status === "done" ? "bg-primary text-white" : "bg-surface-subtle"}`}>{step.status === "done" ? "✓" : index}</span>{step.label}</h4>
      <span className="flex items-center gap-2 text-xs text-text-muted"><StatusPill tone={step.status === "done" ? "success" : "neutral"}>{statusLabel[step.status]}</StatusPill>{step.chip}</span>
    </div>
    {step.bars.map(bar => <PlanBar key={bar.label} {...bar} />)}
    {step.lines.length > 0 && <ul className="grid gap-0.5 text-xs text-text-muted">{step.lines.map(line => <li key={line}>{line}</li>)}</ul>}
    {Children.toArray(children).length > 0 && <div className="flex flex-wrap justify-end gap-2">{children}</div>}
  </li>;
}
