"use client";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { Subtabs } from "@/components/ui/management-screen/management-table";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import type { CycleAccess } from "@/features/cycles-api/cycle-plan-tab";
import { StatusConfirmDialog } from "@/features/farming-management/status-confirm-dialog";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { ErrorNotice, Skeleton, useMutation } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { RaftCyclesTab } from "./raft-cycles-tab";
import { RaftInfoTab } from "./raft-info-tab";
import { RaftLogsTab } from "./raft-logs-tab";
import { RaftMaterialsTab } from "./raft-materials-tab";
import { RaftLanesTab } from "./raft-lanes-tab";
import { DISCONTINUED, IN_USE, parseRaftDetail, raftStatusLabel, readRaftDetail, type RaftDetail } from "./raft-model";

/** Tabs and actions the signed-in account may use for a raft of the chosen zone. `cycle` carries the cycle and care-log rights; `materialCreate` is the right to record material use. */
export type RaftAccess = { edit: boolean; photoEdit: boolean; cycles: boolean; costs: boolean; logs?: boolean; cycle?: CycleAccess; materialCreate?: boolean };
export type RaftTabKey = "info" | "cycles" | "logs" | "materials" | "lanes";
const tabKeys: readonly RaftTabKey[] = ["info", "cycles", "logs", "materials", "lanes"];
/** Tab names of the screens that merged into this one (the old cycle screen and the former cost and photo tabs) still open the right tab. */
const legacyTabs: Record<string, RaftTabKey> = { journey: "cycles", progress: "cycles", plan: "cycles", history: "cycles", summary: "cycles", costs: "materials", photo: "lanes" };
export const raftTabOf = (value?: string | null): RaftTabKey | undefined => tabKeys.find(key => key === value) ?? (value ? legacyTabs[value] : undefined);
const repository = createWorkspaceRepository("rafts");

/**
 * The opened raft. Opening it reads only the raft record; every tab reads its own data when it is first opened ("Hiện trạng" in "Thông tin" comes from the record itself).
 * `initialTab` is the tab a link asked for (`?tab=`).
 */
export function RaftDetailPanel({ id, zoneId, zoneLabel, access, guard, initialTab, onChanged }: { id: string; zoneId: string; zoneLabel: string; access: RaftAccess; guard: UnsavedGuard; initialTab?: string; /** `notice` is the toast text; an empty one reloads the list without a toast (the form that saved already said so). */ onChanged(notice?: string): void }) {
  const detail = useStickyRemote(useCallback((signal: AbortSignal) => readRaftDetail(id, signal), [id])), mutation = useMutation();
  const tabs = useMemo(() => ([["info", "Thông tin", true], ["cycles", "Chu kỳ nuôi", access.cycles], ["logs", "Nhật ký", !!access.logs], ["materials", "Vật tư", access.costs || !!access.materialCreate], ["lanes", "Làn", true]] as const)
    .filter(entry => entry[2]).map(([key, label]) => ({ key, label })), [access]);
  const [picked, setTab] = useState<RaftTabKey | undefined>(() => raftTabOf(initialTab)), [action, setAction] = useState<"discontinue" | "reactivate">(), [reviewRequested, setReviewRequested] = useState(false);
  // A linked tab the account may not read falls back to "Thông tin".
  const tab = tabs.some(entry => entry.key === picked) ? picked! : "info";
  const raft = detail.data, prefix = `raft-${id}`;
  function saved(record: RaftDetail) { detail.replace(record); onChanged(); }
  async function confirm() {
    if (!raft || !action || detail.loading || mutation.busy() || mutation.blocked) return;
    const result = await mutation.run(() => repository.mutate(action, { rowVersion: raft.rowVersion }, id));
    setAction(undefined);
    if (!result) return;
    const record = parseRaftDetail(result);
    if (record) saved(record); else { detail.reload(); onChanged(); }
  }
  // A cycle started, edited or closed changes what the record says about the open cycle, so the record is read again.
  const cycleChanged = (notice: string) => { detail.reload(); onChanged(notice); };
  const busy = detail.loading || mutation.pending || mutation.blocked, stopping = action === "discontinue";
  const show = (key: RaftTabKey) => void guard.leave(() => setTab(key));
  const content: Record<RaftTabKey, ReactNode> = raft ? {
    info: <RaftInfoTab raft={raft} zoneId={zoneId} zoneLabel={zoneLabel} canEdit={access.edit} canEditPhotos={access.photoEdit} busy={busy} dirtyRef={guard.dirty} onSaved={saved} onReload={detail.reload}
      onOpenCycles={access.cycles ? () => show("cycles") : undefined} onStatus={() => { mutation.reviewed(); setAction(raft.statusId === IN_USE ? "discontinue" : "reactivate"); }} />,
    cycles: <RaftCyclesTab raft={raft} zoneId={zoneId} zoneLabel={zoneLabel} access={access.cycle} guard={guard} onChanged={cycleChanged} onOpenLogs={() => setTab("logs")} />,
    logs: <RaftLogsTab raft={raft} zoneId={zoneId} access={access} guard={guard} />,
    materials: <RaftMaterialsTab raft={raft} zoneId={zoneId} access={access} />,
    lanes: <RaftLanesTab raft={raft} zoneId={zoneId} canReadCycles={access.cycles} dirtyRef={guard.dirty} pendingRef={guard.pending} onReload={detail.reload} />,
  } : { info: null, cycles: null, logs: null, materials: null, lanes: null };
  return <section id={`raft-preview-${id}`} className={styles.detail} aria-label="Chi tiết bè nuôi">
    {detail.loading && !raft && <Skeleton />}
    <ErrorNotice error={detail.error || mutation.error} />
    {detail.error && <Button key="retry" type="button" className="w-auto" variant="secondary" onClick={detail.reload}>Thử lại tải hồ sơ</Button>}
    {mutation.blocked && <div role="alert" className={styles.alert}><p>Hãy tải lại hồ sơ để đối chiếu trước khi thực hiện thao tác mới.</p><div>
      <Button key="reload" type="button" className="w-auto" variant="secondary" disabled={detail.loading} onClick={() => { detail.reload(); setReviewRequested(true); }}>Tải hồ sơ mới để đối chiếu</Button>
      {reviewRequested && !detail.loading && !detail.error && !mutation.uncertain && <Button key="reviewed" type="button" className="w-auto" variant="secondary" onClick={() => { mutation.reviewed(); setReviewRequested(false); }}>Đã đối chiếu hồ sơ</Button>}
    </div></div>}
    {raft && <>
      <header className={styles.header}><h3>Bè {raft.code}</h3><StatusPill tone={raft.statusId === DISCONTINUED ? "neutral" : "success"}>{raftStatusLabel(raft.statusId)}</StatusPill></header>
      <Subtabs<RaftTabKey> label="Hồ sơ bè nuôi" tabs={tabs} value={tab} idPrefix={prefix} onChange={key => { if (key !== tab) show(key); }} />
      <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} tabIndex={0} className={styles.body}>{content[tab]}</div>
      {action && <StatusConfirmDialog title={stopping ? "Ngừng sử dụng bè?" : "Sử dụng lại bè?"} subject={`Bè ${raft.code} · ${zoneLabel}`}
        description={stopping ? "Hồ sơ và lịch sử vẫn được giữ." : "Bè xuất hiện trở lại trong các danh mục đang sử dụng."}
        confirmLabel={stopping ? "Xác nhận ngừng sử dụng" : "Xác nhận sử dụng lại"} pending={mutation.pending} busy={mutation.busy} onCancel={() => setAction(undefined)} onConfirm={() => void confirm()} />}
    </>}
  </section>;
}
