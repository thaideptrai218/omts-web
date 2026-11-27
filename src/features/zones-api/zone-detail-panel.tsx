"use client";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { Subtabs } from "@/components/ui/management-screen/management-table";
import { createWorkspaceRepository, type ApiRecord } from "@/features/api-workspace/workspace-repository";
import { ErrorNotice, Skeleton, useMutation } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { StatusConfirmDialog } from "@/features/farming-management/status-confirm-dialog";
import { zoneBoundaryRepository } from "@/features/zone-boundary/zone-boundary-repository";
import { ZoneInfoTab } from "./zone-info-tab";
import { ZoneLicensesTab } from "./zone-licenses-tab";
import { ZoneRaftsTab } from "./zone-rafts-tab";
import { ZoneStaffTab } from "./zone-staff-tab";
import { ZoneStatusDialog, type ZoneStatusAction } from "./zone-status-dialog";
import { ZoneWaterTab } from "./zone-water-tab";
import { DISCONTINUED, IN_USE, parseZoneDetail, zoneStatusLabel, type ZoneDetail } from "./zone-model";
import type { RaftAccess } from "@/features/rafts-api/raft-detail-panel";
import { useZoneDetail } from "./use-zone-detail";
import local from "./zone-tabs.module.css";
import { ZoneMapTab } from "./zone-map-tab";
import type { ZoneTabKey } from "./zone-summary-model";

/** Which tabs and actions the signed-in account may use; each tab appears only when it may be read. */
/** `boundary`: may read the licence map and change or clear the boundary of an In Use zone (the Owner, like the backend). */
export type ZoneAccess = { edit: boolean; boundary: boolean; rafts: boolean; licenses: boolean; staff: boolean; water: boolean; waterCreate: boolean; raftCreate: boolean; raft: RaftAccess };
type TabKey = ZoneTabKey;
const tabKeys: readonly string[] = ["info", "map", "rafts", "licenses", "staff", "water"];
const repository = createWorkspaceRepository("zones");

export function ZoneDetailPanel({ id, access, guard, zones, onChanged }: { id: string; access: ZoneAccess; guard: UnsavedGuard; zones: ApiRecord[]; onChanged(): void }) {
  const detail = useZoneDetail(id), mutation = useMutation();
  // A link to this zone (`?recordId=<id>&tab=map`) opens it on that tab.
  const params = useSearchParams(), linkedTab = params?.get("recordId") === id ? params.get("tab") : null;
  const [openRaft, setOpenRaft] = useState<{ id: string; code: string }>(), [picked, setTab] = useState<TabKey>(() => linkedTab && tabKeys.includes(linkedTab) ? linkedTab as TabKey : "info"), [action, setAction] = useState<ZoneStatusAction>(), [reviewRequested, setReviewRequested] = useState(false);
  const [clearing, setClearing] = useState(false);
  const zone = detail.data;
  const tabs = useMemo(() => ([["info", "Thông tin", true], ["map", "Bản đồ", true], ["rafts", "Bè nuôi", access.rafts], ["licenses", "Giấy phép", access.licenses],
    ["staff", "Nhân viên", access.staff], ["water", "Quan trắc nước", access.water]] as const).filter(entry => entry[2]).map(([key, label]) => ({ key, label })), [access]);
  // A linked tab the account may not read falls back to "Thông tin".
  const tab = tabs.some(entry => entry.key === picked) ? picked : "info";
  const prefix = `zone-${id}`;
  // A licence is offered for In Use zones; the open zone stays in the list so its own documents can be added whatever its status.
  const coverable = useMemo(() => zones.filter(row => row.statusId !== DISCONTINUED || row.id === id), [zones, id]);

  function saved(record: ZoneDetail) { detail.replace(record); onChanged(); }
  async function confirm() {
    if (!zone || !action || detail.loading || mutation.busy() || mutation.blocked) return;
    const result = await mutation.run(() => repository.mutate(action, { rowVersion: zone.rowVersion }, id));
    setAction(undefined);
    if (!result) return;
    const record = parseZoneDetail(result);
    if (record) saved(record); else { detail.reload(); onChanged(); }
  }
  /** Clearing the boundary sends `boundary: null`; the zone keeps its last pin. */
  async function clearBoundary() {
    if (!zone || detail.loading || mutation.busy() || mutation.blocked) return;
    const result = await mutation.run(() => zoneBoundaryRepository.save(id, null, zone.rowVersion));
    setClearing(false);
    if (result) saved(result.zone);
  }
  const busy = detail.loading || mutation.pending || mutation.blocked;
  const content: Record<TabKey, ReactNode> = zone ? {
    info: <ZoneInfoTab zone={zone} canEdit={access.edit} canBoundary={access.boundary && zone.statusId === IN_USE} canSeeLicense={access.licenses} busy={busy} dirtyRef={guard.dirty} onSaved={saved} onReload={detail.reload} onClearBoundary={() => { mutation.reviewed(); setClearing(true); }} onStatus={() => { mutation.reviewed(); setAction(zone.statusId === IN_USE ? "discontinue" : "reactivate"); }} />,
    map: <ZoneMapTab zone={zone} canSeeRafts={access.rafts} onOpenRaft={raft => void guard.leave(() => { setOpenRaft(raft); setTab("rafts"); })} />,
    rafts: <ZoneRaftsTab zoneId={id} zoneLabel={`${zone.code} · ${zone.name}`} canCreate={access.raftCreate && zone.statusId === IN_USE} raftAccess={access.raft} guard={guard} focus={openRaft} />, licenses: <ZoneLicensesTab zoneId={id} zones={coverable} guard={guard} canDelete={access.boundary && zone.statusId === IN_USE} />,
    staff: <ZoneStaffTab zoneId={id} />, water: <ZoneWaterTab zoneId={id} zoneName={zone.name} canCreate={access.waterCreate && zone.statusId === IN_USE} />,
  } : { info: null, map: null, rafts: null, licenses: null, staff: null, water: null };
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
      <Subtabs<TabKey> label="Hồ sơ vùng nuôi" tabs={tabs} value={tab} idPrefix={prefix} onChange={key => { if (key !== tab) void guard.leave(() => setTab(key)); }} />
      <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} tabIndex={0} className={`${styles.body} ${local.tabScroll}`}>{content[tab]}</div>
      {clearing && <StatusConfirmDialog title="Xóa ranh giới?" subject={`${zone.code} · ${zone.name}`} description="Vùng không còn ranh giới theo sơ đồ cấp phép và giữ lại vị trí điểm đã có; bè không bị đổi. Có thể đọc lại sơ đồ để lưu ranh giới mới." confirmLabel="Xác nhận xóa ranh giới" pending={mutation.pending} busy={mutation.busy} onCancel={() => setClearing(false)} onConfirm={() => void clearBoundary()} />}
      {action && <ZoneStatusDialog action={action} zone={zone} pending={mutation.pending} busy={mutation.busy} onCancel={() => setAction(undefined)} onConfirm={() => void confirm()} />}
    </>}
  </section>;
}
