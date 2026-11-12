"use client";
import { useId, useState } from "react";
import { Subtabs } from "@/components/ui/management-screen/management-table";
import type { Job } from "./job-types-model";
import { JobTypeInfoTab } from "./job-types-info-tab";
import { JobTypeRateHistory } from "./job-types-rate-history";
import styles from "./job-types-screen.module.css";

type Tab = "info" | "history";
const tabs = [{ key: "info" as const, label: "Thông tin" }, { key: "history" as const, label: "Lịch sử đơn giá" }];

/** Keep the info draft mounted while users consult the read-only rate history. */
export function JobTypeDetailPanel({ record, canEdit, onSynced, onStateChanged }: { record: Job; canEdit: boolean; onSynced(job: Job): void; onStateChanged(): void }) {
  const [tab, setTab] = useState<Tab>("info"), prefix = useId();
  return <section className={styles.detail} aria-label="Chi tiết loại công việc">
    <Subtabs<Tab> label="Nội dung loại công việc" tabs={tabs} value={tab} onChange={setTab} idPrefix={prefix} />
    <div role="tabpanel" id={`${prefix}-panel-info`} aria-labelledby={`${prefix}-tab-info`} hidden={tab !== "info"} className={styles.tabBody}><JobTypeInfoTab record={record} canEdit={canEdit} onSynced={onSynced} onStateChanged={onStateChanged} /></div>
    <div role="tabpanel" id={`${prefix}-panel-history`} aria-labelledby={`${prefix}-tab-history`} hidden={tab !== "history"} className={styles.tabBody}><JobTypeRateHistory record={record} /></div>
  </section>;
}
