"use client";
import Link from "next/link";
import { useCallback, type ReactNode } from "react";
import { zoneCycles } from "@/features/cycles-api/contracts";
import { readCycles } from "@/features/cycles-api/repository";
import { licenseOverviewSchema, stateLabel } from "@/features/farming-api/contracts";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday, useRemote } from "@/features/operations/ui";
import type { ZoneAccess } from "./zone-detail-panel";
import { currentLicenses, expiryText, summarizeCycles, summarizeRafts, type ZoneTabKey } from "./zone-summary-model";
import { readZoneRafts, readZoneStaffCount, readZoneWater, readZoneYield } from "./zone-summary-reads";
import styles from "./zone-kpi.module.css";

type Remote<Value> = { data?: Value; error?: string; loading: boolean; reload(): void };
type Target = { tab: ZoneTabKey } | { href: string };
/** Chip result: `value` is the bold part, `alert` paints it as a warning. */
type Shown = { value: ReactNode; alert?: boolean };

/** One chip: small skeleton while loading, a muted retry chip on error, otherwise a button to its tab (or a link to its screen). */
function Chip<Value>({ label, remote, show, target, onOpenTab }: { label: string; remote: Remote<Value>; show(data: Value): Shown; target: Target; onOpenTab(tab: ZoneTabKey): void }) {
  if (remote.loading) return <div role="status" aria-label={`Đang tải ${label}`} className={`omts-skeleton ${styles.pulse}`} />;
  if (remote.error || remote.data === undefined) return <button key="retry" type="button" className={`${styles.chip} ${styles.mutedChip}`} title={remote.error} onClick={remote.reload}><span>{label}</span> không tải được · Thử lại</button>;
  const shown = show(remote.data), className = `${styles.chip} ${shown.alert ? styles.alertChip : ""}`;
  const content = <><span>{label}</span><strong>{shown.value}</strong></>;
  return "tab" in target ? <button key="tab" type="button" className={className} onClick={() => onOpenTab(target.tab)}>{content}</button>
    : <Link key="screen" className={className} href={target.href}>{content}</Link>;
}

const licenses = createOperationsRepository("zone-licenses");
const kg = (value: number) => `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} kg`;

/** One slim row of figures from real reads; each chip loads on its own, only for what the account may see. */
export function ZoneKpiStrip({ zoneId, access, canSeeLicense, onOpenTab }: { zoneId: string; access: ZoneAccess; canSeeLicense: boolean; onOpenTab(tab: ZoneTabKey): void }) {
  const today = businessToday();
  return <div className={styles.strip} role="group" aria-label="Số liệu nhanh của vùng">
    {access.rafts && <RaftsChip zoneId={zoneId} onOpenTab={onOpenTab} />}
    {access.cycles && <CyclesChip zoneId={zoneId} onOpenTab={onOpenTab} />}
    {access.staff && <StaffChip zoneId={zoneId} onOpenTab={onOpenTab} />}
    {canSeeLicense && <LicenseChip zoneId={zoneId} today={today} onOpenTab={onOpenTab} />}
    {access.water && <WaterChip zoneId={zoneId} onOpenTab={onOpenTab} />}
    {access.yield && <YieldChip zoneId={zoneId} onOpenTab={onOpenTab} />}
  </div>;
}

type Props = { zoneId: string; onOpenTab(tab: ZoneTabKey): void };
function RaftsChip({ zoneId, onOpenTab }: Props) {
  const remote = useRemote(useCallback((signal: AbortSignal) => readZoneRafts(zoneId, signal), [zoneId]));
  return <Chip label="Bè" remote={remote} target={{ tab: "rafts" }} onOpenTab={onOpenTab} show={rafts => { const sum = summarizeRafts(rafts); return { value: `${sum.inUse}/${sum.total}` }; }} />;
}
function CyclesChip({ zoneId, onOpenTab }: Props) {
  const remote = useRemote(useCallback((signal: AbortSignal) => readCycles({ action: "zone", zoneId }, zoneCycles, signal), [zoneId]));
  return <Chip label="Chu kỳ" remote={remote} target={{ tab: "cycles" }} onOpenTab={onOpenTab} show={rows => ({ value: summarizeCycles(rows).open })} />;
}
function StaffChip({ zoneId, onOpenTab }: Props) {
  const remote = useRemote(useCallback((signal: AbortSignal) => readZoneStaffCount(zoneId, signal), [zoneId]));
  return <Chip label="Nhân viên" remote={remote} target={{ tab: "staff" }} onOpenTab={onOpenTab} show={total => ({ value: total })} />;
}
function LicenseChip({ zoneId, today, onOpenTab }: Props & { today: string }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => licenses.read("list", { zoneId, asOf: today }, licenseOverviewSchema, signal), [zoneId, today]));
  return <Chip label="Giấy phép:" remote={remote} target={{ tab: "licenses" }} onOpenTab={onOpenTab} show={overview => {
    const rows = currentLicenses(overview.licenses);
    if (!rows.length) return { value: "Chưa có hồ sơ", alert: true };
    const first = rows.find(row => row.state !== "Valid") ?? rows[0];
    return { value: `${stateLabel(first.state)} (${expiryText(first.expiryDate, today).toLocaleLowerCase("vi")})`, alert: first.state === "Expired" };
  }} />;
}
function WaterChip({ zoneId, onOpenTab }: Props) {
  const remote = useRemote(useCallback((signal: AbortSignal) => readZoneWater(zoneId, signal), [zoneId]));
  return <Chip label="Nước:" remote={remote} target={{ tab: "water" }} onOpenTab={onOpenTab} show={({ latest }) => {
    const last = latest[0];
    return last ? { value: `pH ${last.ph} / ${last.salinity}‰ / ${last.temperature}°C`, alert: last.valuesOutside.length > 0 } : { value: "chưa có phép đo" };
  }} />;
}
function YieldChip({ zoneId, onOpenTab }: Props) {
  const remote = useRemote(useCallback((signal: AbortSignal) => readZoneYield(zoneId, signal), [zoneId]));
  return <Chip label="Thu hoạch tháng này:" remote={remote} target={{ href: "/operations/harvest-yield" }} onOpenTab={onOpenTab} show={totals => ({ value: `${totals.lotCount} lô · ${kg(totals.estimatedKg)}` })} />;
}
