"use client";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { Subtabs } from "@/components/ui/management-screen/management-table";
import styles from "@/features/farming-management/farming-management.module.css";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { cycleStateLabel, cycleStateOf, type CycleRow } from "./cycle-model";
import { CycleEditor } from "./cycle-editor";
import { CycleHistoryTab } from "./cycle-history-tab";
import { CycleJourneyTab } from "./cycle-journey-tab";
import { CycleLogsTab } from "./cycle-logs-tab";
import { CyclePlanTab, type CycleAccess } from "./cycle-plan-tab";
import { CycleProgressTab } from "./cycle-progress-tab";

type TabKey = "journey" | "progress" | "plan" | "history" | "logs";
const tabKeys: readonly TabKey[] = ["journey", "progress", "plan", "history", "logs"];
/** Opened raft row of the cycle screen: progress, plan, history and care log of the raft's cycles in place. */
export function CycleDetailPanel({ row, zoneId, access, guard, onChanged }: { row: CycleRow; zoneId: string; access: CycleAccess; guard: UnsavedGuard; onChanged(notice: string): void }) {
  // Opens on "Hành trình"; a link may ask for another tab with ?tab=, and a link to one specific cycle (?cycleId=) opens its "Tiến độ".
  const params = useSearchParams(), requested = params?.get("tab");
  const [tab, setTab] = useState<TabKey>(() => tabKeys.find(key => key === requested) ?? (params?.get("cycleId") ? "progress" : "journey")), prefix = `cycle-${row.raftId}`;
  const [starting, setStarting] = useState(false);
  const canStart = access.create && row.canStart;
  const tabs = useMemo(() => ([["journey", "Hành trình", true], ["progress", "Tiến độ", true], ["plan", "Kế hoạch", true], ["history", "Lịch sử", true], ["logs", "Nhật ký chăm sóc", access.logs && !!row.cycle]] as const)
    .filter(entry => entry[2]).map(([key, label]) => ({ key, label })), [access.logs, row.cycle]);
  const state = cycleStateOf(row);
  const jump = (target: "plan" | "logs") => { void guard.leave(() => setTab(target)); };
  const content: Record<TabKey, ReactNode> = {
    journey: <CycleJourneyTab row={row} zoneId={zoneId} access={access} onJump={jump} onChanged={onChanged} />,
    progress: <CycleProgressTab row={row} zoneId={zoneId} canSeeFlow={access.view} />,
    plan: <CyclePlanTab row={row} access={access} dirtyRef={guard.dirty} onChanged={onChanged} />,
    history: <CycleHistoryTab zoneId={zoneId} raftId={row.raftId} />,
    logs: row.cycle ? <CycleLogsTab dirtyRef={guard.dirty} cycleId={row.cycle.id} zoneId={zoneId} openCycle={row.canEdit} canCreate={access.logsCreate} canEdit={access.logsEdit} /> : null,
  };
  return <section id={`cycle-preview-${row.raftId}`} className={styles.detail} aria-label="Chi tiết chu kỳ của bè">
    <header className={styles.header}><h3><Link className={styles.link} href={farmingReferenceHref("raft", { zoneId, recordId: row.raftId, search: row.raftCode })}>Bè {row.raftCode}</Link></h3><StatusPill tone={state === "open" ? "success" : "neutral"}>{cycleStateLabel(state)}</StatusPill>
    </header>
    {canStart && starting && <CycleEditor raftId={row.raftId} raftCode={row.raftCode} canCancel={false} onClose={() => setStarting(false)} onSaved={() => { setStarting(false); setTab("journey"); onChanged("Đã bắt đầu chu kỳ nuôi."); }} />}
    <Subtabs<TabKey> label="Chu kỳ nuôi của bè" tabs={tabs} value={tab} idPrefix={prefix} onChange={key => { if (key !== tab) void guard.leave(() => setTab(key)); }} />
    <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} tabIndex={0} className={styles.body}>{content[tab]}
      {canStart && <TabFooter right={<Button key="start-cycle" type="button" className="w-auto" onClick={() => { void guard.leave(() => setStarting(true)); }}>Bắt đầu chu kỳ nuôi</Button>} />}
    </div>
  </section>;
}
