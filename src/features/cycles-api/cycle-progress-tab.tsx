"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { useCallback, useState } from "react";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { CyclePlanSummary } from "@/features/cultivation-api/lane-board";
import { HarvestAwareLaneOverview } from "@/features/cultivation-api/harvest-aware-lane-overview";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { businessToday, ErrorNotice, Field, Select, Skeleton, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { CycleLaneDetail } from "./cycle-lane-detail";
import { CyclePlanTracking } from "./cycle-plan-tracking";
import type { CycleRow } from "./cycle-model";
import { cycleHistory, cycleProgress } from "./contracts";
import { readCycles } from "./repository";
import cycleStyles from "./cycles-screen.module.css";

/** "Tiến độ": lane board of a chosen cycle or date, the seeding sessions of a lane and the plan tracking. */
export function CycleProgressTab({ row, zoneId, canSeeFlow }: { row: CycleRow; zoneId: string; canSeeFlow: boolean }) {
  const params = useSearchParams();
  const [cycleId, setCycleId] = useState(params?.get("cycleId") ?? row.cycle?.id ?? ""), [date, setDate] = useState(businessToday);
  const [laneDirty, setLaneDirty] = useState(false), [lanePending, setLanePending] = useState(false);
  const history = useRemote(useCallback((signal: AbortSignal) => readCycles({ action: "history", raftId: row.raftId }, cycleHistory, signal), [row.raftId]));
  const progress = useRemote(useCallback((signal: AbortSignal) => readCycles({ action: "progress", raftId: row.raftId, ...(cycleId ? { cycleId } : { date }) }, cycleProgress, signal), [row.raftId, cycleId, date]));
  const flow = (area: "seeding" | "material" | "harvest") => farmingReferenceHref(area, { zoneId, raftId: row.raftId, cycleId: progress.data?.cycle?.id ?? cycleId });
  const data = progress.data;
  return <>
    <div className={styles.subToolbar}>
      <Select label="Chu kỳ" value={cycleId} disabled={laneDirty || lanePending} onChange={event => setCycleId(event.target.value)}><option value="">Tra cứu theo ngày</option>
        {history.data?.map(cycle => <option key={cycle.id} value={cycle.id}>{formatVietnameseDate(cycle.startDate)} → {cycle.closeDate ? formatVietnameseDate(cycle.closeDate) : "Đang nuôi"}</option>)}</Select>
      {!cycleId && <Field label="Ngày xem" type="date" max={businessToday()} value={date} disabled={laneDirty || lanePending} onChange={event => setDate(event.target.value)} />}
    </div>
    <ErrorNotice error={history.error} />
    {progress.loading ? <Skeleton /> : progress.error || !data ? <ListStateMessage error={progress.error ?? "Không tải được tiến độ."} onRetry={progress.reload} retryLabel="Tải lại tiến độ" />
      : <div className={cycleStyles.progressLayout}>
        <div className={cycleStyles.progressMain}>
          <div className={cycleStyles.sectionHeading}><h3>Tiến độ làn nuôi</h3><span>{formatVietnameseDate(data.date)}{data.cycle ? ` · ${data.cycle.daysOfFarming} ngày nuôi` : ""}</span></div>
          {!data.cycle && <p className={styles.hint}>Chưa có chu kỳ trong ngày này.</p>}
          <HarvestAwareLaneOverview key={`${row.raftId}:${data.cycle?.id}:${date}`} raftId={row.raftId} zoneId={zoneId} cycleId={data.cycle?.id ?? "no-cycle"} allowFinish={!!cycleId || date === businessToday()} lanes={data.lanes} onChanged={progress.reload} label="Sơ đồ làn nuôi"
            onDirty={setLaneDirty} onPending={setLanePending}
            renderLaneDetails={item => <CycleLaneDetail key={`${data.cycle?.id}:${item.laneNumber}`} raftId={row.raftId} zoneId={zoneId} cycleId={data.cycle?.id} lane={item.laneNumber} />} />
        </div>
        {data.cycle && <aside className={cycleStyles.planPanel}><CyclePlanSummary plan={data.cycle} /><CyclePlanTracking cycleId={data.cycle.id} zoneId={zoneId} /></aside>}
      </div>}
    {canSeeFlow && data?.cycle && <TabFooter left={<><Link className={styles.footerLink} href={flow("seeding")}>Thả giống</Link><Link className={styles.footerLink} href={flow("harvest")}>Thu hoạch</Link><Link className={styles.footerLink} href={flow("material")}>Sử dụng vật tư (tùy chọn)</Link></>} />}
  </>;
}
