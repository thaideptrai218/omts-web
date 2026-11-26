"use client";
import Link from "next/link";
import { useCallback } from "react";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { indicatorRange } from "@/features/zones-api/zone-water-model";
import * as c from "./contracts";
import { Skeleton, useRemote } from "./ui";
import { waterRepository } from "./water-measurement-shared";
import local from "./water-screen.module.css";

const ROWS = [["ph", "pH"], ["salinity", "Độ mặn"], ["temperature", "Nhiệt độ"]] as const;

/** "Ngưỡng cảnh báo" of the zone as a card that is always shown: the three ranges in force, and for the owner a link to where they are changed. */
export function WaterThresholdCard({ zoneId, canEdit }: { zoneId: string; canEdit: boolean }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => waterRepository.read("thresholds", { zoneId }, c.zoneThresholdsSchema, signal), [zoneId]));
  return <section aria-label="Ngưỡng cảnh báo" className={`${local.card} ${local.thresholdCard}`}>
    <div className={local.cardHead}><h2>Ngưỡng cảnh báo</h2></div>
    {remote.error && !remote.data ? <ListStateMessage error={remote.error} onRetry={remote.reload} retryLabel="Tải lại ngưỡng" />
      : !remote.data ? <Skeleton />
      : <dl className={local.thresholdRows}>{ROWS.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{indicatorRange(remote.data!.thresholds, key) ?? "Chưa đặt"}</dd></div>)}</dl>}
    {canEdit && <footer className={local.cardFooter}><Link className="text-sm font-semibold text-primary" href="/settings?section=water-thresholds">Sửa ngưỡng</Link></footer>}
  </section>;
}
