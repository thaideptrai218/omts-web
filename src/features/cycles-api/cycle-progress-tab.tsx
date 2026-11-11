"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { CyclePlanSummary, LaneBoard } from "@/features/cultivation-api/lane-board";
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
  const [cycleId, setCycleId] = useState(row.cycle?.id ?? ""), [date, setDate] = useState(businessToday), [lane, setLane] = useState<number>();
  const [applied, setApplied] = useState({ cycleId: row.cycle?.id ?? "", date: businessToday() });
  const history = useRemote(useCallback((signal: AbortSignal) => readCycles({ action: "history", raftId: row.raftId }, cycleHistory, signal), [row.raftId]));
  const progress = useRemote(useCallback((signal: AbortSignal) => readCycles({ action: "progress", raftId: row.raftId, ...(applied.cycleId ? { cycleId: applied.cycleId } : { date: applied.date }) }, cycleProgress, signal), [row.raftId, applied]));
  const flow = (area: string) => `/operations/${area}?zoneId=${encodeURIComponent(zoneId)}&raftId=${encodeURIComponent(row.raftId)}`;
  const data = progress.data;
  return <>
    <div className={styles.subToolbar}>
      <Select label="Chu kỳ" value={cycleId} onChange={event => setCycleId(event.target.value)}><option value="">Tra cứu theo ngày</option>
        {history.data?.map(cycle => <option key={cycle.id} value={cycle.id}>{formatVietnameseDate(cycle.startDate)} → {cycle.closeDate ? formatVietnameseDate(cycle.closeDate) : "Đang nuôi"}</option>)}</Select>
      <Field label="Ngày xem" type="date" max={businessToday()} disabled={!!cycleId} value={date} onChange={event => setDate(event.target.value)} />
      <Button key="view" type="button" className="w-auto" variant="secondary" disabled={progress.loading || (!cycleId && !date)} onClick={() => { setApplied({ cycleId, date }); setLane(undefined); }}>Xem tiến độ</Button>
    </div>
    <ErrorNotice error={history.error} />
    {progress.loading ? <Skeleton /> : progress.error || !data ? <ListStateMessage error={progress.error ?? "Không tải được tiến độ."} onRetry={progress.reload} retryLabel="Tải lại tiến độ" />
      : <div className={cycleStyles.progressLayout}>
        <div className={cycleStyles.progressMain}>
          <div className={cycleStyles.sectionHeading}><h3>Tiến độ làn nuôi</h3><span>{formatVietnameseDate(data.date)}{data.cycle ? ` · ${data.cycle.daysOfFarming} ngày nuôi` : ""}</span></div>
          {!data.cycle && <p className={styles.hint}>Chưa có chu kỳ trong ngày này.</p>}
          <LaneBoard lanes={data.lanes} selected={lane} onSelect={setLane} />
          {lane ? <CycleLaneDetail key={`${row.raftId}:${data.cycle?.id}:${lane}`} raftId={row.raftId} zoneId={zoneId} cycleId={data.cycle?.id} lane={lane} onClose={() => setLane(undefined)} />
            : !!data.lanes.length && <p className={styles.hint}>Chọn một làn để xem các lần thả giống.</p>}
        </div>
        {data.cycle && <aside className={cycleStyles.planPanel}><CyclePlanSummary plan={data.cycle} /><CyclePlanTracking cycleId={data.cycle.id} zoneId={zoneId} /></aside>}
      </div>}
    {canSeeFlow && data?.cycle && <TabFooter left={<><Link className={styles.footerLink} href={flow("seeding")}>Thả giống</Link><Link className={styles.footerLink} href={flow("material-usages")}>Sử dụng vật tư</Link></>} />}
  </>;
}
