"use client";
import { useState } from "react";
import { z } from "zod";
import { PhotoThumbnails } from "@/components/form/photo-thumbnails";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useToast } from "@/components/ui/toast-provider";
import { Facts, TabFooter } from "@/features/farming-management/detail-parts";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { EditedRecordHistory } from "@/features/history/record-history";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { viDateTime } from "@/features/purchase-documents/document-parts";
import { logTypeLabel, type CultivationLog } from "./log-contracts";
import { logPhotoSrc } from "./log-photo-src";
import { logRequest } from "./log-repository";
import { LogEditor } from "./log-screen";

const fmtDateTime = (value?: string | null) => value && !Number.isNaN(Date.parse(value)) ? viDateTime(value) : "—";

/** One log as a card: its facts, photos (click to enlarge), history and, while the backend allows it, "Sửa" (in the same card) and "Gỡ nhật ký". */
export function LogCard({ log, cycleId, startDate, zoneId, canEdit, guard, onClose, onChanged }: { log: CultivationLog; cycleId: string; startDate?: string; zoneId: string; canEdit: boolean; guard: UnsavedGuard; onClose(): void; onChanged(): void }) {
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
      <Facts items={[["Ngày chăm sóc", formatVietnameseDate(log.visitDate)], ["Loại nhật ký", logTypeLabel(log.logType)], ["Ghi lúc", fmtDateTime(log.recordedAt)], ["Người ghi", log.recordedByName], ["Nội dung", <span key="notes" className="whitespace-pre-wrap">{log.notes ?? "—"}</span>]]} />
      <PhotoThumbnails items={log.photos.map((photo, index) => ({ key: photo.key, src: logPhotoSrc(log.id, zoneId, index), label: `Ảnh ${index + 1}` }))} />
      <EditedRecordHistory kind="care-log" id={log.id} zoneId={zoneId} />
      <ErrorNotice error={mutation.error} />
      <TabFooter left={allowed ? <Button key="remove-log" type="button" variant="ghost" className="w-auto" disabled={mutation.pending || mutation.blocked} onClick={() => void remove()}><InterfaceIcon name="trash" className="size-4" />Gỡ nhật ký</Button> : undefined}
        right={allowed ? <Button key="edit-log" type="button" className="w-auto" disabled={mutation.pending || mutation.blocked} onClick={() => setEditing(true)}><InterfaceIcon name="pencil" className="size-4" />Sửa</Button> : undefined} />
    </>}
  </Dialog>;
}
