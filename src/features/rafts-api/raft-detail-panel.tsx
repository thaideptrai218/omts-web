"use client";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { Subtabs } from "@/components/ui/management-screen/management-table";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { RaftMaterialCosts } from "@/features/farming-api/raft-screen";
import { StatusConfirmDialog } from "@/features/farming-management/status-confirm-dialog";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { ErrorNotice, Skeleton, useMutation } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { RaftCyclesTab } from "./raft-cycles-tab";
import { RaftInfoTab } from "./raft-info-tab";
import { RaftPhotoTab } from "./raft-photo-tab";
import { DISCONTINUED, IN_USE, parseRaftDetail, raftStatusLabel, readRaftDetail, type RaftDetail } from "./raft-model";

/** Tabs and actions the signed-in account may use for a raft of the chosen zone. */
export type RaftAccess = { edit: boolean; photoEdit: boolean; cycles: boolean; costs: boolean };
type TabKey = "info" | "photo" | "costs" | "cycles";
const repository = createWorkspaceRepository("rafts");

export function RaftDetailPanel({ id, zoneId, zoneLabel, access, guard, onChanged }: { id: string; zoneId: string; zoneLabel: string; access: RaftAccess; guard: UnsavedGuard; onChanged(): void }) {
  const detail = useStickyRemote(useCallback((signal: AbortSignal) => readRaftDetail(id, signal), [id])), mutation = useMutation();
  const [tab, setTab] = useState<TabKey>("info"), [action, setAction] = useState<"discontinue" | "reactivate">(), [reviewRequested, setReviewRequested] = useState(false);
  const raft = detail.data, prefix = `raft-${id}`;
  const tabs = useMemo(() => ([["info", "Thông tin", true], ["photo", "Ảnh và làn", true], ["costs", "Chi phí vật tư", access.costs], ["cycles", "Chu kỳ nuôi", access.cycles]] as const)
    .filter(entry => entry[2]).map(([key, label]) => ({ key, label })), [access]);
  function saved(record: RaftDetail) { detail.replace(record); onChanged(); }
  async function confirm() {
    if (!raft || !action || detail.loading || mutation.busy() || mutation.blocked) return;
    const result = await mutation.run(() => repository.mutate(action, { rowVersion: raft.rowVersion }, id));
    setAction(undefined);
    if (!result) return;
    const record = parseRaftDetail(result);
    if (record) saved(record); else { detail.reload(); onChanged(); }
  }
  const busy = detail.loading || mutation.pending || mutation.blocked, stopping = action === "discontinue";
  const content: Record<TabKey, ReactNode> = raft ? {
    info: <RaftInfoTab raft={raft} zoneId={zoneId} zoneLabel={zoneLabel} canEdit={access.edit} busy={busy} dirtyRef={guard.dirty} onSaved={saved} onReload={detail.reload} onStatus={() => { mutation.reviewed(); setAction(raft.statusId === IN_USE ? "discontinue" : "reactivate"); }} />,
    photo: <RaftPhotoTab raftId={id} canEdit={access.photoEdit} />, costs: <RaftMaterialCosts raftId={id} zoneId={zoneId} />, cycles: <RaftCyclesTab raftId={id} zoneId={zoneId} />,
  } : { info: null, photo: null, costs: null, cycles: null };
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
      <Subtabs<TabKey> label="Hồ sơ bè nuôi" tabs={tabs} value={tab} idPrefix={prefix} onChange={key => { if (key !== tab) void guard.leave(() => setTab(key)); }} />
      <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} tabIndex={0} className={styles.body}>{content[tab]}</div>
      {action && <StatusConfirmDialog title={stopping ? "Ngừng sử dụng bè?" : "Sử dụng lại bè?"} subject={`Bè ${raft.code} · ${zoneLabel}`}
        description={stopping ? "Hồ sơ và lịch sử vẫn được giữ." : "Bè xuất hiện trở lại trong các danh mục đang sử dụng."}
        confirmLabel={stopping ? "Xác nhận ngừng sử dụng" : "Xác nhận sử dụng lại"} pending={mutation.pending} busy={mutation.busy} onCancel={() => setAction(undefined)} onConfirm={() => void confirm()} />}
    </>}
  </section>;
}
