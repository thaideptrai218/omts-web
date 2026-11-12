"use client";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { replaceUrlParams } from "@/features/farming-management/replace-url-params";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { StatusPill } from "@/components/ui/management-page";
import { Subtabs } from "@/components/ui/management-screen/management-table";
import styles from "@/features/farming-management/farming-management.module.css";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { cycleStateLabel, cycleStateOf, type CycleRow } from "./cycle-model";
import { CycleHistoryTab } from "./cycle-history-tab";
import { CycleJourneyTab } from "./cycle-journey-tab";
import { CycleLogsTab } from "./cycle-logs-tab";
import { CyclePlanTab, type CycleAccess } from "./cycle-plan-tab";
import { CycleProgressTab } from "./cycle-progress-tab";

type TabKey = "journey" | "progress" | "plan" | "history" | "logs" | "summary";
const tabKeys: readonly TabKey[] = ["journey", "progress", "plan", "history", "logs", "summary"];
/** Opened raft row of the Hành trình screen: the journey summary (Tổng hợp), lane progress, plan, care log, history and closing (Tổng kết) of the raft's cycles in place. */
export function CycleDetailPanel({ row, zoneId, access, guard, onChanged }: { row: CycleRow; zoneId: string; access: CycleAccess; guard: UnsavedGuard; onChanged(notice: string): void }) {
  // Opens on "Tổng hợp" (key "journey"); a link may ask for another tab with ?tab=, and a link to one specific cycle (?cycleId=) opens its "Tiến độ".
  // The screen writes raftId, cycleId and tab itself when a row opens, so only the URL of THIS raft counts (the URL can lag a render behind).
  const params = useSearchParams(), linked = (params?.get("raftId") ?? row.raftId) === row.raftId, requested = linked ? params?.get("tab") : null;
  const [tab, setTab] = useState<TabKey>(() => tabKeys.find(key => key === requested) ?? (linked && params?.get("cycleId") ? "progress" : "journey")), prefix = `cycle-${row.raftId}`;
  const showTab = (target: TabKey) => { setTab(target); replaceUrlParams({ tab: target }); };
  const tabs = useMemo(() => ([["journey", "Tổng hợp", true], ["progress", "Tiến độ làn", true], ["plan", "Kế hoạch", true], ["logs", "Nhật ký chăm sóc", access.logs && !!row.cycle], ["history", "Lịch sử", true], ["summary", "Tổng kết", !!row.cycle]] as const)
    .filter(entry => entry[2]).map(([key, label]) => ({ key, label })), [access.logs, row.cycle]);
  const state = cycleStateOf(row);
  const jump = (target: "plan" | "logs") => { void guard.leave(() => showTab(target)); };
  const content: Record<TabKey, ReactNode> = {
    journey: <CycleJourneyTab part="overview" row={row} zoneId={zoneId} access={access} onJump={jump} onChanged={onChanged} />,
    summary: <CycleJourneyTab part="summary" row={row} zoneId={zoneId} access={access} onJump={jump} onChanged={onChanged} />,
    progress: <CycleProgressTab row={row} zoneId={zoneId} canSeeFlow={access.view} />,
    plan: <CyclePlanTab row={row} access={access} dirtyRef={guard.dirty} onChanged={onChanged} />,
    history: <CycleHistoryTab zoneId={zoneId} raftId={row.raftId} />,
    logs: row.cycle ? <CycleLogsTab dirtyRef={guard.dirty} cycleId={row.cycle.id} zoneId={zoneId} openCycle={row.canEdit} canCreate={access.logsCreate} canEdit={access.logsEdit} /> : null,
  };
  return <section id={`cycle-preview-${row.raftId}`} className={styles.detail} aria-label="Chi tiết hành trình của bè">
    <header className={styles.header}><h3><Link className={styles.link} href={farmingReferenceHref("raft", { zoneId, recordId: row.raftId, search: row.raftCode })}>Bè {row.raftCode}</Link></h3><StatusPill tone={state === "open" ? "success" : "neutral"}>{cycleStateLabel(state)}</StatusPill>
      {row.cycle && !row.cycle.nurseryBatchId && <StatusPill tone="neutral">Không qua ươm</StatusPill>}
    </header>
    {row.canStart && <p className="my-3 text-sm text-text-muted" role="note">Chu kỳ mới được tạo khi hoàn tất ươm. <Link className={styles.link} href="/farming/nursery">Mở màn Ươm giống</Link></p>}
    <Subtabs<TabKey> label="Hành trình của bè" tabs={tabs} value={tab} idPrefix={prefix} onChange={key => { if (key !== tab) void guard.leave(() => showTab(key)); }} />
    <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} tabIndex={0} className={styles.body}>{content[tab]}
    </div>
  </section>;
}
