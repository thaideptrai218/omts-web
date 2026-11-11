"use client";
import { useMemo, useState, type ReactNode } from "react";
import { StatusPill } from "@/components/ui/management-page";
import { Subtabs } from "@/components/ui/management-screen/management-table";
import { cycleStateLabel, cycleStateOf, type CycleRow } from "@/features/cycles-api/cycle-model";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { CultivationProgress } from "./cultivation-progress";
import flowStyles from "./cultivation-flow.module.css";
import { HarvestPanel } from "./records-harvest-panel";
import { MaterialsPanel } from "./records-materials-panel";
import { SeedingPanel } from "./records-seeding-panel";
import type { RecordsArea } from "./records-shared";

type TabKey = "records" | "progress";
const recordsLabel: Record<RecordsArea, string> = { seeding: "Thả giống", "material-usages": "Sử dụng vật tư", harvest: "Thu hoạch" };

/** Opened raft row of the seeding, material-use and harvest screens: the area's records and the lane progress, in place. */
export function RecordsRaftPanel({ area, row, zoneId }: { area: RecordsArea; row: CycleRow; zoneId: string }) {
  const [tab, setTab] = useState<TabKey>("records"), prefix = `records-${area}-${row.raftId}`;
  const tabs = useMemo(() => [{ key: "records" as const, label: recordsLabel[area] }, ...(area === "material-usages" ? [] : [{ key: "progress" as const, label: "Tiến độ làn" }])], [area]);
  const state = cycleStateOf(row);
  const content: Record<TabKey, ReactNode> = {
    records: area === "seeding" ? row.cycle ? <SeedingPanel zoneId={zoneId} raftId={row.raftId} cycleId={row.cycle.id} /> : <p className={flowStyles.empty}>Bè chưa có chu kỳ nuôi. Mở chu kỳ trước khi ghi nhận thả giống.</p>
      : area === "material-usages" ? <MaterialsPanel zoneId={zoneId} raftId={row.raftId} /> : <HarvestPanel zoneId={zoneId} raftId={row.raftId} />,
    progress: <CultivationProgress raftId={row.raftId} zoneId={zoneId} />,
  };
  return <section id={`cycle-preview-${row.raftId}`} className={styles.detail} aria-label="Hồ sơ vận hành của bè">
    <header className={styles.header}><h3>Bè {row.raftCode}</h3><StatusPill tone={state === "open" ? "success" : "neutral"}>{cycleStateLabel(state)}</StatusPill>
      <span className={styles.hint}>{row.laneCount} làn nuôi{row.cycle ? ` · Chu kỳ từ ${formatVietnameseDate(row.cycle.startDate)}` : ""}</span></header>
    <Subtabs<TabKey> label="Hồ sơ vận hành của bè" tabs={tabs} value={tab} idPrefix={prefix} onChange={setTab} />
    <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} tabIndex={0} className={`${styles.body} ${flowStyles.page}`}>{content[tab]}</div>
  </section>;
}
