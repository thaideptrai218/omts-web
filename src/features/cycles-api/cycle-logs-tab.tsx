"use client";
import { Fragment, useCallback, useState, type RefObject } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useToast } from "@/components/ui/toast-provider";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { displayTime, ErrorNotice, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { CultivationLog } from "./log-contracts";
import { logListSchema, logRequest } from "./log-repository";
import { LogEditor, photoHref } from "./log-screen";

/** One opened log at a time; its correction and removal actions belong to that detail. */
export function CycleLogsTab({ cycleId, openCycle, canCreate, canEdit, dirtyRef }: { cycleId: string; openCycle: boolean; canCreate: boolean; canEdit: boolean; dirtyRef?: RefObject<boolean> }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => logRequest("list", cycleId, logListSchema, undefined, undefined, signal), [cycleId]));
  const [editor, setEditor] = useState<CultivationLog | null>(), [opened, setOpened] = useState<string>();
  const mutation = useMutation(), confirmation = useActionDialog(), { notify } = useToast();
  async function remove(log: CultivationLog) {
    const reason = await confirmation.prompt("Lý do gỡ nhật ký chăm sóc");
    if (!reason) return;
    const result = await mutation.run(() => logRequest("remove", log.id, z.object({ removed: z.literal(true) }), { reason }));
    if (result) { remote.reload(); notify({ tone: "success", title: `Đã gỡ nhật ký ngày ${formatVietnameseDate(log.visitDate)}.` }); }
  }
  function saved() { const date = editor?.visitDate; setEditor(undefined); remote.reload(); notify({ tone: "success", title: date ? `Đã lưu nhật ký ngày ${formatVietnameseDate(date)}.` : "Đã ghi nhật ký chăm sóc." }); }
  async function toggle(id: string) {
    if (editor !== undefined && !(await confirmation.confirm("Bỏ các thay đổi nhật ký chưa lưu?"))) return;
    setEditor(undefined); setOpened(current => current === id ? undefined : id);
  }
  if (remote.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được nhật ký chăm sóc."} onRetry={remote.reload} retryLabel="Tải lại" />;
  return <>
    {confirmation.dialog}
    <ErrorNotice error={mutation.error} />
    {mutation.blocked && <p role="alert" className={styles.alert}>Hãy tải lại nhật ký để đối chiếu trước khi thao tác tiếp. Hệ thống không tự gửi lại lệnh.</p>}
    {remote.data.length === 0 ? <p className={styles.hint}>Chu kỳ chưa có nhật ký chăm sóc.</p>
      : <table className={styles.subTable}><thead><tr><th scope="col">Ngày chăm sóc</th><th scope="col">Nội dung</th><th scope="col">Người ghi</th></tr></thead>
        <tbody>{remote.data.map(log => <Fragment key={log.id}>
          <tr onClick={() => void toggle(log.id)}><td><button type="button" className={styles.link} aria-expanded={opened === log.id} onClick={event => { event.stopPropagation(); void toggle(log.id); }}>{formatVietnameseDate(log.visitDate)}</button></td><td className="whitespace-pre-wrap">{log.notes ?? "—"}</td><td>{log.recordedByName ?? "—"}<br /><small>{displayTime(log.recordedAt)}</small></td></tr>
          {opened === log.id && <tr><td colSpan={3}><section aria-label={`Nhật ký ngày ${formatVietnameseDate(log.visitDate)}`}>
            {editor?.id === log.id ? <LogEditor key={log.id} cycleId={cycleId} dirtyRef={dirtyRef} record={log} onClose={() => setEditor(undefined)} onSaved={saved} /> : <>
              <p className="whitespace-pre-wrap">{log.notes ?? "—"}</p>
              <div>{log.photos.map((photo, index) => { const href = photoHref(photo.url); return href ? <a key={photo.key} className={`${styles.link} mr-2`} href={href} target="_blank" rel="noopener noreferrer">Ảnh {index + 1}</a> : <span key={photo.key}>Ảnh {index + 1} không khả dụng</span>; })}</div>
              {log.canCorrect && canEdit && <TabFooter left={<Button key="remove-log" type="button" className="w-auto" variant="ghost" disabled={mutation.pending || mutation.blocked} onClick={() => void remove(log)}>Gỡ nhật ký</Button>} right={<Button key="edit-log" type="button" className="w-auto" disabled={mutation.pending || mutation.blocked} onClick={() => setEditor(log)}>Chỉnh sửa</Button>} />}
            </>}
          </section></td></tr>}
        </Fragment>)}</tbody></table>}
    <TabFooter left={<Button key="reload-logs" type="button" className="w-auto" variant="ghost" disabled={mutation.pending || editor !== undefined} onClick={remote.reload}>Tải lại nhật ký</Button>}
      right={openCycle && canCreate ? <Button key="write-log" type="button" className="w-auto" disabled={editor !== undefined} onClick={() => setEditor(null)}>Ghi nhật ký chăm sóc</Button> : undefined} />
    {editor === null && <LogEditor key="create-log" cycleId={cycleId} dirtyRef={dirtyRef} record={null} onClose={() => setEditor(undefined)} onSaved={saved} />}
  </>;
}
