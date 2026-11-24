"use client";
import Link from "next/link";
import { StatusPill } from "@/components/ui/management-page";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { farmedSeedText } from "@/features/cycles-api/cycle-farmed-seed";
import { compressLaneNumbers } from "@/features/farming-management/lane-ranges";
import { Facts } from "@/features/farming-management/detail-parts";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import styles from "@/features/farming-management/farming-management.module.css";
import { displayTime, Skeleton } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { laneProgressDisplay } from "@/features/farming-management/lane-progress-display";
import { keptLanes, phaseLabel, seededTotalText, summarizeLanes } from "./raft-live-model";
import type { RaftLive, RaftLiveAccess } from "./use-raft-live";

type Water = NonNullable<RaftLive["water"]["data"]>["items"][number];
const danger = { color: "var(--omts-color-danger)" };

function WaterValue({ live, raftId }: { live: RaftLive["water"]; raftId: string }) {
  if (live.loading && !live.data) return "Đang tải…";
  if (live.error && !live.data) return <button type="button" className={styles.link} onClick={live.reload}>Không tải được · Thử lại</button>;
  const row: Water | undefined = (live.data?.items ?? []).filter(item => item.raftId === raftId && item.alertState !== "Voided").sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
  if (!row) return "Chưa có phép đo gần đây của bè này";
  return <>pH {row.ph} · {row.salinity}‰ · {row.temperature}°C · {displayTime(row.measuredAt)}
    {row.valuesOutside.length > 0 && <strong style={danger}><br />Ngoài ngưỡng: {row.valuesOutside.map(value => `${value.indicator} ${value.direction === "High" ? "cao" : "thấp"}`).join(", ")}</strong>}</>;
}

/** Live state of the raft at the top of its record: cycle, phase, days farming, seed, lanes by state, damaged lanes and the last water reading. */
export function RaftLiveHeader({ raftId, zoneId, live, access }: { raftId: string; zoneId: string; live: RaftLive; access: RaftLiveAccess }) {
  const { progress, seeding } = live;
  if (!access.cycles) return <p className={styles.hint}>Bạn không có quyền xem chu kỳ và tiến độ làn của bè này.</p>;
  if (progress.loading && !progress.data) return <Skeleton />;
  if (!progress.data) return <ListStateMessage error={progress.error ?? "Không tải được hiện trạng của bè."} onRetry={progress.reload} retryLabel="Tải lại hiện trạng" />;
  const data = progress.data, cycle = data.cycle, summary = summarizeLanes(data.lanes);
  const damaged = keptLanes(data.lanes).filter(lane => laneProgressDisplay(lane).state === "Damaged").map(lane => lane.laneNumber);
  const seeded = seeding.data ? seededTotalText(seeding.data.records) : undefined;
  const open = !!cycle && !cycle.closeDate;
  return <section aria-label="Hiện trạng của bè" className="mb-3 rounded-control border border-border bg-surface-subtle p-3">
    <div className="mb-2 flex flex-wrap items-center gap-2"><StatusPill tone={open ? "success" : "neutral"}>{phaseLabel(data)}</StatusPill>
      <strong className="text-sm">{summary.text}</strong>{summary.detail && <span className="text-xs text-text-muted">{summary.detail}</span>}
      {progress.error && <button type="button" className={styles.link} onClick={progress.reload}>Cập nhật chưa được · Thử lại</button>}</div>
    <Facts items={[
      ["Chu kỳ hiện tại", cycle ? <Link key="cycle" className={styles.link} href={farmingReferenceHref("cycle", { zoneId, raftId, cycleId: cycle.id })}>Bắt đầu {formatVietnameseDate(cycle.startDate)}{cycle.closeDate ? ` · kết thúc ${formatVietnameseDate(cycle.closeDate)}` : ""}</Link> : "Chưa có chu kỳ đang nuôi"],
      ["Số ngày nuôi", cycle ? `${cycle.daysOfFarming} ngày` : null],
      ["Giống đang nuôi", cycle ? farmedSeedText(cycle) : null],
      ["Số lượng đã thả", cycle ? seeding.loading && !seeding.data ? "Đang tải…" : seeded ?? "Chưa ghi nhận thả giống" : null],
      ["Làn hỏng", damaged.length ? <strong key="damaged" style={danger}>Làn {compressLaneNumbers(damaged)} đang hỏng, chưa sửa</strong> : "Không có làn hỏng"],
      ...(access.water ? [["Đo nước gần nhất", <WaterValue key="water" live={live.water} raftId={raftId} />] as const] : []),
    ]} />
  </section>;
}
