"use client";
import Link from "next/link";
import { useCallback } from "react";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { zoneThresholdsSchema } from "@/features/operations/contracts";
import { TabFooter, Facts } from "@/features/farming-management/detail-parts";
import { createOperationsRepository } from "@/features/operations/repository";
import { Skeleton, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";

const repository = createOperationsRepository("water");
const range = (min: number | null, max: number | null) => min === null && max === null ? "Chưa đặt" : `${min ?? "—"} – ${max ?? "—"}`;
/** "Quan trắc nước": the zone's alert thresholds; measurements and threshold edits live on the water screen. */
export function ZoneWaterTab({ zoneId }: { zoneId: string }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => repository.read("thresholds", { zoneId }, zoneThresholdsSchema, signal), [zoneId]));
  if (remote.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được ngưỡng chất lượng nước."} onRetry={remote.reload} retryLabel="Tải lại" />;
  const { thresholds } = remote.data;
  return <>
    <Facts items={[["Ngưỡng pH", range(thresholds.phMin, thresholds.phMax)], ["Ngưỡng độ mặn (‰)", range(thresholds.salinityMin, thresholds.salinityMax)], ["Ngưỡng nhiệt độ (°C)", range(thresholds.temperatureMin, thresholds.temperatureMax)]]} />
    <TabFooter right={<Link className={styles.footerLink} href={`/operations/water?zoneId=${encodeURIComponent(zoneId)}`}>Mở theo dõi chất lượng nước</Link>} />
  </>;
}
