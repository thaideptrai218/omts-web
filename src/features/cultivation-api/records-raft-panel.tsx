"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { FarmingStepBar } from "@/features/farming-management/farming-step-bar";
import { CycleProgressTab } from "@/features/cycles-api/cycle-progress-tab";
import { useMemo, useState, type ReactNode } from "react";
import { StatusPill } from "@/components/ui/management-page";
import { Subtabs } from "@/components/ui/management-screen/management-table";
import { cycleStateLabel, cycleStateOf, type CycleRow } from "@/features/cycles-api/cycle-model";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";

import flowStyles from "./cultivation-flow.module.css";
import { HarvestPanel } from "./records-harvest-panel";
import { HarvestLotPreview } from "./harvest-lot-preview";
import { MaterialsPanel } from "./records-materials-panel";
import { SeedingPanel } from "./records-seeding-panel";
import type { RecordsArea } from "./records-shared";

type TabKey = "records" | "progress";
const recordsLabel: Record<RecordsArea, string> = { seeding: "Thả giống", "material-usages": "Sử dụng vật tư", harvest: "Thu hoạch" };

/** Older lots have a supported detail endpoint even though the raft list only exposes its latest cycle. */
function HistoricalHarvestRecord({ id, zoneId }: { id: string; zoneId: string }) {
  const [open, setOpen] = useState(true), [revision, setRevision] = useState(0);
  return open ? <HarvestLotPreview key={revision} id={id} zoneId={zoneId} onClose={() => setOpen(false)} onSaved={() => setRevision(value => value + 1)} />
    : <button type="button" className="p-3 text-sm text-primary underline" onClick={() => setOpen(true)}>Mở lại chi tiết lô thu hoạch</button>;
}

/** Opened raft row of the seeding, material-use and harvest screens: the area's records and the lane progress, in place. */
export function RecordsRaftPanel({ area, row, zoneId }: { area: RecordsArea; row: CycleRow; zoneId: string }) {
  const params = useSearchParams(), selectedCycleId = params.get("cycleId") ?? row.cycle?.id;
  const [tab, setTab] = useState<TabKey>("records"), prefix = `records-${area}-${row.raftId}`;
  const tabs = useMemo(() => [{ key: "records" as const, label: recordsLabel[area] }, ...(area === "material-usages" ? [] : [{ key: "progress" as const, label: "Tiến độ làn" }])], [area]);
  const state = cycleStateOf(row);
  const unavailableHarvestCycle = area === "harvest" && !!selectedCycleId && selectedCycleId !== row.cycle?.id;
  const harvestRecordId = area === "harvest" ? params.get("recordId") : null;
  const content: Record<TabKey, ReactNode> = {
    records: area === "seeding" ? selectedCycleId ? <SeedingPanel zoneId={zoneId} raftId={row.raftId} cycleId={selectedCycleId} cycleStartDate={row.cycle?.id === selectedCycleId ? row.cycle.startDate : undefined} /> : <p className={flowStyles.empty}>Bè chưa có chu kỳ nuôi. Mở chu kỳ trước khi ghi nhận thả giống.</p>
      : area === "material-usages" ? <MaterialsPanel zoneId={zoneId} raftId={row.raftId} cycleId={selectedCycleId} /> : unavailableHarvestCycle && harvestRecordId ? <HistoricalHarvestRecord key={harvestRecordId} id={harvestRecordId} zoneId={zoneId} /> : unavailableHarvestCycle ? <div className="space-y-2 p-3 text-sm"><p>Chu kỳ đã chọn không phải chu kỳ gần nhất của bè. Màn ghi nhận thu hoạch chỉ hỗ trợ chu kỳ gần nhất; chọn một lô trong Sản lượng nuôi để xem thu hoạch cũ.</p><Link className="text-primary underline" href={farmingReferenceHref("yield", { zoneId, raftId: row.raftId, cycleId: selectedCycleId })}>Xem thu hoạch của chu kỳ đã chọn</Link><br /><Link className="text-primary underline" href={farmingReferenceHref("harvest", { zoneId, raftId: row.raftId })}>Mở thu hoạch chu kỳ gần nhất</Link></div> : <HarvestPanel zoneId={zoneId} raftId={row.raftId} />,
    progress: <CycleProgressTab row={row} zoneId={zoneId} canSeeFlow={true} />,
  };
  return <section id={`cycle-preview-${row.raftId}`} className={styles.detail} aria-label="Hồ sơ vận hành của bè">
    <header className={styles.header}><h3><Link href={farmingReferenceHref("raft", { zoneId, recordId: row.raftId, search: row.raftCode })}>Bè {row.raftCode}</Link></h3><StatusPill tone={state === "open" ? "success" : "neutral"}>{cycleStateLabel(state)}</StatusPill>
      <span className={styles.hint}>{row.laneCount} làn nuôi{row.cycle ? <> · <Link href={farmingReferenceHref("cycle", { zoneId, raftId: row.raftId, cycleId: row.cycle.id })}>Chu kỳ từ {formatVietnameseDate(row.cycle.startDate)}</Link></> : ""}</span></header>
    <FarmingStepBar current={area === "material-usages" ? "material" : area} zoneId={zoneId} raftId={row.raftId} cycleId={selectedCycleId} />
    <Subtabs<TabKey> label="Hồ sơ vận hành của bè" tabs={tabs} value={tab} idPrefix={prefix} onChange={setTab} />
    <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} tabIndex={0} className={`${styles.body} ${flowStyles.page}`}>{content[tab]}</div>
  </section>;
}
