"use client";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { Subtabs } from "@/components/ui/management-screen/management-table";
import { createWorkspaceRepository, type ApiRecord } from "@/features/api-workspace/workspace-repository";
import { ErrorNotice, Skeleton, useMutation } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { ZoneCyclesTab } from "./zone-cycles-tab";
import { ZoneInfoTab } from "./zone-info-tab";
import { ZoneLicensesTab } from "./zone-licenses-tab";
import { ZoneRaftsTab } from "./zone-rafts-tab";
import { ZoneStaffTab } from "./zone-staff-tab";
import { ZoneStatusDialog, type ZoneStatusAction } from "./zone-status-dialog";
import { ZoneWaterTab } from "./zone-water-tab";
import { DISCONTINUED, IN_USE, parseZoneDetail, zoneStatusLabel, type ZoneDetail } from "./zone-model";
import type { RaftAccess } from "@/features/rafts-api/raft-detail-panel";
import { useZoneDetail } from "./use-zone-detail";
import kpi from "./zone-kpi.module.css";
import { ZoneKpiStrip } from "./zone-kpi-strip";
import { ZoneMapTab } from "./zone-map-tab";
import type { ZoneTabKey } from "./zone-summary-model";

/** Which tabs and actions the signed-in account may use; each tab appears only when it may be read. */
export type ZoneAccess = { edit: boolean; rafts: boolean; licenses: boolean; cycles: boolean; staff: boolean; water: boolean; yield: boolean; raft: RaftAccess };
type TabKey = ZoneTabKey;
const repository = createWorkspaceRepository("zones");

export function ZoneDetailPanel({ id, access, guard, zones, onChanged }: { id: string; access: ZoneAccess; guard: UnsavedGuard; zones: ApiRecord[]; onChanged(): void }) {
  const detail = useZoneDetail(id), mutation = useMutation();
  const [openRaft, setOpenRaft] = useState<string>(), [tab, setTab] = useState<TabKey>("info"), [action, setAction] = useState<ZoneStatusAction>(), [reviewRequested, setReviewRequested] = useState(false);
  const zone = detail.data;
  const tabs = useMemo(() => ([["info", "Thông tin", true], ["map", "Bản đồ", true], ["rafts", "Bè nuôi", access.rafts], ["licenses", "Giấy phép", access.licenses], ["cycles", "Chu kỳ nuôi", access.cycles],
    ["staff", "Nhân viên", access.staff], ["water", "Quan trắc nước", access.water]] as const).filter(entry => entry[2]).map(([key, label]) => ({ key, label })), [access]);
  const prefix = `zone-${id}`;

  function saved(record: ZoneDetail) { detail.replace(record); onChanged(); }
  async function confirm() {
    if (!zone || !action || detail.loading || mutation.busy() || mutation.blocked) return;
    const result = await mutation.run(() => repository.mutate(action, { rowVersion: zone.rowVersion }, id));
    setAction(undefined);
    if (!result) return;
    const record = parseZoneDetail(result);
    if (record) saved(record); else { detail.reload(); onChanged(); }
  }
  const busy = detail.loading || mutation.pending || mutation.blocked;
  const content: Record<TabKey, ReactNode> = zone ? {
    info: <ZoneInfoTab zone={zone} canEdit={access.edit} canSeeLicense={access.licenses} busy={busy} dirtyRef={guard.dirty} onSaved={saved} onReload={detail.reload} onStatus={() => { mutation.reviewed(); setAction(zone.statusId === IN_USE ? "discontinue" : "reactivate"); }} />,
    map: <ZoneMapTab zone={zone} canSeeRafts={access.rafts} onOpenRaft={raftId => void guard.leave(() => { setOpenRaft(raftId); setTab("rafts"); })} />,
    rafts: <ZoneRaftsTab zoneId={id} raftAccess={access.raft} guard={guard} openId={openRaft} />, licenses: <ZoneLicensesTab zoneId={id} zones={zones} guard={guard} />, cycles: <ZoneCyclesTab zoneId={id} />,
    staff: <ZoneStaffTab zoneId={id} />, water: <ZoneWaterTab zoneId={id} />,
  } : { info: null, map: null, rafts: null, licenses: null, cycles: null, staff: null, water: null };
  return <section id={`zone-preview-${id}`} className={styles.detail} aria-label="Chi tiết vùng nuôi">
    {detail.loading && !zone && <Skeleton />}
    <ErrorNotice error={detail.error || mutation.error} />
    {detail.error && <Button key="retry" type="button" className="w-auto" variant="secondary" onClick={detail.reload}>Thử lại tải hồ sơ</Button>}
    {mutation.blocked && <div role="alert" className={styles.alert}><p>Hãy tải lại hồ sơ để đối chiếu trước khi thực hiện thao tác mới.</p><div>
      <Button key="reload" type="button" className="w-auto" variant="secondary" disabled={detail.loading} onClick={() => { detail.reload(); setReviewRequested(true); }}>Tải hồ sơ mới để đối chiếu</Button>
      {reviewRequested && !detail.loading && !detail.error && !mutation.uncertain && <Button key="reviewed" type="button" className="w-auto" variant="secondary" onClick={() => { mutation.reviewed(); setReviewRequested(false); }}>Đã đối chiếu hồ sơ</Button>}
    </div></div>}
    {zone && <>
      <header className={styles.header}><h3>{zone.code} · {zone.name}</h3><StatusPill tone={zone.statusId === DISCONTINUED ? "neutral" : "success"}>{zoneStatusLabel(zone.statusId)}</StatusPill></header>
      <ZoneKpiStrip zoneId={id} access={access} canSeeLicense={access.licenses} onOpenTab={key => void guard.leave(() => setTab(key))} />
      <Subtabs<TabKey> label="Hồ sơ vùng nuôi" tabs={tabs} value={tab} idPrefix={prefix} onChange={key => { if (key !== tab) void guard.leave(() => setTab(key)); }} />
      <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} tabIndex={0} className={`${styles.body} ${kpi.tabScroll}`}>{content[tab]}</div>
      {action && <ZoneStatusDialog action={action} zone={zone} pending={mutation.pending} busy={mutation.busy} onCancel={() => setAction(undefined)} onConfirm={() => void confirm()} />}
    </>}
  </section>;
}
