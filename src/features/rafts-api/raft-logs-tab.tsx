"use client";
import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { z } from "zod";
import { PhotoThumbnails } from "@/components/form/photo-thumbnails";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, ManagementPagination } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useToast } from "@/components/ui/toast-provider";
import type { CultivationLog } from "@/features/cycles-api/log-contracts";
import { logPhotoSrc } from "@/features/cycles-api/log-photo-src";
import { logListSchema, logRequest } from "@/features/cycles-api/log-repository";
import { LogEditor } from "@/features/cycles-api/log-screen";
import { Facts, TabFooter } from "@/features/farming-management/detail-parts";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { RecordHistory } from "@/features/history/record-history";
import { ErrorNotice, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { RaftAccess } from "./raft-detail-panel";
import { fmtDateTime } from "./raft-format";
import type { RaftDetail } from "./raft-model";
import { useOpenCycle } from "./use-open-cycle";

/**
 * "Nhật ký": the care logs of the raft's open cycle as a table (care date as the link, time recorded, recorder, text, photos); the link opens the log as a card
 * with its photos and the correction and removal the backend allows. "+ Ghi nhật ký" opens the log form. The backend returns the whole list, so it is paged here.
 * Without an open cycle there is nothing to log against.
 */
export function RaftLogsTab({ raft, zoneId, access, guard }: { raft: RaftDetail; zoneId: string; access: RaftAccess; guard: UnsavedGuard }) {
  const open = useOpenCycle(raft);
  if (open.loading) return <Skeleton />;
  if (open.error || open.cycle === undefined) return <ListStateMessage error={open.error ?? "Không tải được chu kỳ của bè."} onRetry={open.reload} retryLabel="Tải lại" />;
  if (!open.cycle) return <p className={styles.hint}>Bè chưa có chu kỳ đang mở nên chưa có nhật ký chăm sóc. Hãy bắt đầu chu kỳ ở tab Chu kỳ nuôi.</p>;
  return <CycleLogs key={open.cycle.id} cycleId={open.cycle.id} startDate={open.cycle.startDate} zoneId={zoneId} canCreate={!!access.cycle?.logsCreate} canEdit={!!access.cycle?.logsEdit} guard={guard} />;
}

function CycleLogs({ cycleId, startDate, zoneId, canCreate, canEdit, guard }: { cycleId: string; startDate: string; zoneId: string; canCreate: boolean; canEdit: boolean; guard: UnsavedGuard }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => logRequest("list", cycleId, logListSchema, undefined, undefined, signal), [cycleId]));
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10), [creating, setCreating] = useState(false), [viewing, setViewing] = useState<string>();
  const { notify } = useToast();
  const logs = useMemo(() => [...(remote.data ?? [])].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)), [remote.data]);
  const current = Math.min(page, Math.max(1, Math.ceil(logs.length / pageSize))), shown = logs.slice((current - 1) * pageSize, current * pageSize);
  const viewed = logs.find(log => log.id === viewing);
  if (remote.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được nhật ký chăm sóc."} onRetry={remote.reload} retryLabel="Tải lại" />;
  return <>
    {logs.length === 0 ? <p className={styles.hint}>Chu kỳ chưa có nhật ký chăm sóc.</p>
      : <><div className="overflow-x-auto"><table className={styles.subTable}><thead><tr><th scope="col">Nhật ký</th><th scope="col">Thời gian ghi</th><th scope="col">Người ghi</th><th scope="col">Nội dung</th><th scope="col">Ảnh</th></tr></thead>
        <tbody>{shown.map(log => <tr key={log.id}>
          <td><button type="button" className={styles.link} aria-label={`Xem nhật ký ngày ${formatVietnameseDate(log.visitDate)}`} onClick={() => setViewing(log.id)}>{formatVietnameseDate(log.visitDate)}</button></td>
          <td className="whitespace-nowrap">{fmtDateTime(log.recordedAt)}</td><td>{log.recordedByName ?? "—"}</td>
          <td className="max-w-xs truncate" title={log.notes ?? undefined}>{log.notes ?? "—"}</td>
          <td>{log.photos.length ? <span className="inline-flex items-center gap-2"><Image src={logPhotoSrc(log.id, zoneId, 0)} alt="" width={32} height={32} unoptimized className="size-8 rounded object-cover" />{log.photos.length}</span> : "—"}</td>
        </tr>)}</tbody></table></div>
        <ManagementPagination page={current} pageSize={pageSize} total={logs.length} unit="nhật ký" onPage={setPage} onPageSize={size => { setPageSize(size); setPage(1); }} /></>}
    <TabFooter left={<Button key="reload-logs" type="button" variant="ghost" className="w-auto" onClick={remote.reload}>Tải lại nhật ký</Button>}
      right={canCreate ? <Button key="write-log" type="button" className="w-auto" onClick={() => void guard.leave(() => setCreating(true))}><InterfaceIcon name="add" className="size-4" />Ghi nhật ký</Button> : undefined} />
    {creating && <LogEditor key="create-log" cycleId={cycleId} startDate={startDate} zoneId={zoneId} dirtyRef={guard.dirty} record={null} onClose={() => setCreating(false)}
      onSaved={() => { setCreating(false); remote.reload(); notify({ tone: "success", title: "Đã ghi nhật ký chăm sóc." }); }} />}
    {viewed && <LogCard log={viewed} cycleId={cycleId} startDate={startDate} zoneId={zoneId} canEdit={canEdit} guard={guard} onClose={() => setViewing(undefined)} onChanged={remote.reload} />}
  </>;
}

/** One log as a card: its facts, photos (click to enlarge), history and, while the backend allows it, "Sửa" (in the same card) and "Gỡ nhật ký". */
function LogCard({ log, cycleId, startDate, zoneId, canEdit, guard, onClose, onChanged }: { log: CultivationLog; cycleId: string; startDate: string; zoneId: string; canEdit: boolean; guard: UnsavedGuard; onClose(): void; onChanged(): void }) {
  const [editing, setEditing] = useState(false), mutation = useMutation(), confirmation = useActionDialog(), { notify } = useToast();
  const title = `Nhật ký ngày ${formatVietnameseDate(log.visitDate)}`, allowed = log.canCorrect && canEdit;
  async function remove() {
    const reason = await confirmation.prompt("Lý do gỡ nhật ký chăm sóc");
    if (!reason) return;
    const result = await mutation.run(() => logRequest("remove", log.id, z.object({ removed: z.literal(true) }), { reason }));
    if (result) { onChanged(); onClose(); notify({ tone: "success", title: `Đã gỡ nhật ký ngày ${formatVietnameseDate(log.visitDate)}.` }); }
  }
  return <Dialog open size="lg" title={title} onOpenChange={open => { if (!open) void guard.leave(onClose); }}>
    {confirmation.dialog}
    {editing ? <LogEditor cycleId={cycleId} startDate={startDate} zoneId={zoneId} dirtyRef={guard.dirty} record={log} onClose={() => setEditing(false)}
      onSaved={() => { setEditing(false); onChanged(); onClose(); notify({ tone: "success", title: `Đã lưu nhật ký ngày ${formatVietnameseDate(log.visitDate)}.` }); }} /> : <>
      <Facts items={[["Ngày chăm sóc", formatVietnameseDate(log.visitDate)], ["Ghi lúc", fmtDateTime(log.recordedAt)], ["Người ghi", log.recordedByName], ["Nội dung", <span key="notes" className="whitespace-pre-wrap">{log.notes ?? "—"}</span>]]} />
      <PhotoThumbnails items={log.photos.map((photo, index) => ({ key: photo.key, src: logPhotoSrc(log.id, zoneId, index), label: `Ảnh ${index + 1}` }))} />
      <RecordHistory kind="care-log" id={log.id} zoneId={zoneId} />
      <ErrorNotice error={mutation.error} />
      <TabFooter left={allowed ? <Button key="remove-log" type="button" variant="ghost" className="w-auto" disabled={mutation.pending || mutation.blocked} onClick={() => void remove()}><InterfaceIcon name="trash" className="size-4" />Gỡ nhật ký</Button> : undefined}
        right={allowed ? <Button key="edit-log" type="button" className="w-auto" disabled={mutation.pending || mutation.blocked} onClick={() => setEditing(true)}><InterfaceIcon name="pencil" className="size-4" />Sửa</Button> : undefined} />
    </>}
  </Dialog>;
}
