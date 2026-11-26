"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { Facts, TabFooter } from "@/features/farming-management/detail-parts";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import styles from "@/features/farming-management/farming-management.module.css";
import * as c from "./contracts";
import { displayTime, statusLabel } from "./ui";
import { againstThreshold } from "./water-history-model";
import { formatMeasuredValue } from "./water-measurement-shared";
import local from "./water-screen.module.css";

const range = (min: number | null, max: number | null) => min === null && max === null ? "Chưa đặt" : `${min ?? "—"} – ${max ?? "—"}`;
const VERDICT = { none: "Chưa đặt ngưỡng", ok: "Trong ngưỡng", low: "Thấp hơn ngưỡng", high: "Cao hơn ngưỡng" } as const;

/** Values of the record against the thresholds it was judged with (the thresholds in force when it was recorded). */
function ThresholdsUsed({ record }: { record: c.WaterMeasurement }) {
  const { thresholdsUsed: t } = record;
  const rows = [["pH", record.ph, t.phMin, t.phMax], ["Độ mặn (‰)", record.salinity, t.salinityMin, t.salinityMax], ["Nhiệt độ (°C)", record.temperature, t.temperatureMin, t.temperatureMax]] as const;
  return <table className={`${styles.subTable} ${local.thresholdTable}`}>
    <caption className="sr-only">Giá trị và ngưỡng đã dùng khi ghi phép đo</caption>
    <thead><tr><th scope="col">Chỉ số</th><th scope="col" className={styles.number}>Đã ghi</th><th scope="col">Ngưỡng đã dùng</th><th scope="col">Đánh giá</th></tr></thead>
    <tbody>{rows.map(([label, value, min, max]) => {
      const verdict = againstThreshold(value, min, max);
      return <tr key={label}><th scope="row">{label}</th><td className={styles.number}>{formatMeasuredValue(value)}</td><td>{range(min, max)}</td>
        <td className={verdict === "low" || verdict === "high" ? local.outside : undefined}>{VERDICT[verdict]}</td></tr>;
    })}</tbody>
  </table>;
}

/** "Thông tin": the measurement and the thresholds it was judged with. A recorded measurement is never corrected; the only change is `Hủy bỏ phép đo`. */
export function WaterMeasurementInfoTab({ record, zoneName, canChange, busy, onVoid }: { record: c.WaterMeasurement; zoneName: string; canChange: boolean; busy: boolean; onVoid(): void }) {
  return <div>
    {record.violatedValues && <p role="alert" className={local.alertLine}>Vượt ngưỡng: {record.violatedValues}</p>}
    <Facts items={[["Thời điểm đo", displayTime(record.measuredAt)], ["Vùng nuôi", <Link key="zone" className={styles.link} href={farmingReferenceHref("zone", { recordId: record.zoneId, search: record.zoneCode })}>{zoneName || record.zoneName}</Link>], ["Bè đo", <Link key="raft" className={styles.link} href={farmingReferenceHref("raft", { zoneId: record.zoneId, recordId: record.raftId, search: record.raftCode })}>{record.raftCode}</Link>], ["Người ghi", record.measuredBy?.name],
      ["Trạng thái", statusLabel(record.statusCode)], ["Cảnh báo", statusLabel(record.alertState)], ["Lý do hủy", record.voidReason]]} />
    <ThresholdsUsed record={record} />
    {canChange && <TabFooter left={<Button key="void" type="button" className="w-auto" variant="ghost" disabled={busy} onClick={onVoid}><InterfaceIcon name="trash" className="size-4" />Hủy bỏ phép đo</Button>} />}
  </div>;
}
