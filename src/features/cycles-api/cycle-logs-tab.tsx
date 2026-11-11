"use client";
import { useCallback, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { displayTime, ErrorNotice, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { CultivationLog } from "./log-contracts";
import { logListSchema, logRequest } from "./log-repository";
import { LogEditor, photoHref } from "./log-screen";

/** "Nhật ký chăm sóc": the care log of the cycle as a list; writing or correcting an entry uses the existing log form. */
export function CycleLogsTab({ cycleId, openCycle, canCreate, canEdit }: { cycleId: string; openCycle: boolean; canCreate: boolean; canEdit: boolean }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => logRequest("list", cycleId, logListSchema, undefined, undefined, signal), [cycleId]));
  const [editor, setEditor] = useState<CultivationLog | null>(), [notice, setNotice] = useState<string>();
  const mutation = useMutation(), confirmation = useActionDialog();
  async function remove(log: CultivationLog) {
    const reason = await confirmation.prompt("Lý do gỡ nhật ký chăm sóc");
    if (!reason) return;
    const result = await mutation.run(() => logRequest("remove", log.id, z.object({ removed: z.literal(true) }), { reason }));
    if (result) { remote.reload(); setNotice("Đã gỡ nhật ký chăm sóc."); }
  }
  if (remote.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được nhật ký chăm sóc."} onRetry={remote.reload} retryLabel="Tải lại" />;
  return <>
    {confirmation.dialog}
    {notice && <p role="status" className={styles.hint}>{notice}</p>}
    <ErrorNotice error={mutation.error} />
    {mutation.blocked && <p role="alert" className={styles.alert}>Hãy tải lại nhật ký để đối chiếu trước khi thao tác tiếp. Hệ thống không tự gửi lại lệnh.</p>}
    {remote.data.length === 0 ? <p className={styles.hint}>Chu kỳ chưa có nhật ký chăm sóc.</p>
      : <table className={styles.subTable}><thead><tr><th scope="col">Ngày chăm sóc</th><th scope="col">Nội dung</th><th scope="col">Người ghi</th><th scope="col">Ảnh</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr></thead>
        <tbody>{remote.data.map(log => <tr key={log.id}>
          <td>{formatVietnameseDate(log.visitDate)}</td><td className="whitespace-pre-wrap">{log.notes ?? "—"}</td>
          <td>{log.recordedByName ?? "—"}<br /><small>{displayTime(log.recordedAt)}</small></td>
          <td>{log.photos.map((photo, index) => { const href = photoHref(photo.url); return href ? <a key={photo.key} className={`${styles.link} mr-2`} href={href} target="_blank" rel="noopener noreferrer">Ảnh {index + 1}</a> : <span key={photo.key}>Ảnh {index + 1} không khả dụng</span>; })}</td>
          <td>{log.canCorrect && canEdit && <span className="flex flex-wrap gap-2"><button type="button" className={styles.link} disabled={mutation.pending || mutation.blocked} onClick={() => setEditor(log)}>Sửa</button>
            <button type="button" className={styles.link} disabled={mutation.pending || mutation.blocked} onClick={() => void remove(log)}>Gỡ nhật ký</button></span>}</td>
        </tr>)}</tbody></table>}
    <TabFooter right={<>
      <Button key="reload" type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={remote.reload}>Tải lại nhật ký</Button>
      {openCycle && canCreate && <Button key="write" type="button" className="w-auto" onClick={() => setEditor(null)}>Ghi nhật ký chăm sóc</Button>}</>} />
    {editor !== undefined && <LogEditor cycleId={cycleId} record={editor} onClose={() => setEditor(undefined)} onSaved={() => { setEditor(undefined); remote.reload(); setNotice("Đã lưu nhật ký chăm sóc."); }} />}
  </>;
}
