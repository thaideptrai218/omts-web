"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import type { BoundaryWarning } from "@/features/zone-boundary/boundary-contract";
import { boundaryErrorText } from "@/features/zone-boundary/boundary-error-text";
import { ZoneBoundaryEditor, type BoundaryEditorValue } from "@/features/zone-boundary/zone-boundary-editor";
import { zoneBoundaryRepository } from "@/features/zone-boundary/zone-boundary-repository";
import type { ZoneDetail } from "./zone-model";

/**
 * "Cập nhật ranh giới": the licence-map editor for an existing zone. The saved boundary is the starting draft, so a corner can simply be fixed;
 * a photo read here is bound to the zone. A save the server refuses as stale (MSG06) or that may or may not have gone through keeps the draft
 * and asks to reload the record first, so the next save carries the new row version.
 */
export function ZoneBoundaryDialog({ zone, busy, onReload, onClose, onSaved }: {
  zone: ZoneDetail; busy: boolean; onReload(): void; onClose(): void; onSaved(zone: ZoneDetail, warnings: BoundaryWarning[]): void;
}) {
  const [value, setValue] = useState<BoundaryEditorValue>();
  const mutation = useMutation(), confirmation = useActionDialog();
  const dirty = !!value?.touched;

  async function close() { if (!mutation.busy() && (!dirty || await confirmation.confirm("Bỏ các thay đổi chưa lưu?"))) onClose(); }
  async function save() {
    const boundary = value?.boundary;
    if (!boundary || !value.touched || value.blocked || value.reading || busy || mutation.busy() || mutation.blocked) return;
    const saved = await mutation.run(() => zoneBoundaryRepository.save(zone.id, boundary, zone.rowVersion));
    if (saved) onSaved(saved.zone, saved.warnings);
  }
  const error = mutation.failure ? boundaryErrorText(mutation.failure) ?? mutation.error : mutation.error;
  const canSave = !!value?.boundary && value.touched && !value.blocked && !value.reading && !busy && !mutation.blocked;
  return <Dialog open size="xl" title={`Cập nhật ranh giới ${zone.code}`} description="Đọc ảnh sơ đồ khu vực biển đề nghị cấp phép, đối chiếu rồi lưu. Ranh giới hiện có được nạp sẵn để sửa." dismissible={!mutation.pending} onOpenChange={open => { if (!open) void close(); }}>
    {confirmation.dialog}
    <form noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      <ZoneBoundaryEditor zoneId={zone.id} initialBoundary={zone.boundary ?? null} disabled={mutation.pending} onChange={setValue} />
      <ErrorNotice error={error} />
      {mutation.blocked && <div role="alert" className={styles.alert}>
        <p>{mutation.failure?.code === "MSG06" ? "Hồ sơ vùng đã thay đổi từ lần bạn mở." : "Chưa xác nhận được kết quả lưu."} Hãy tải lại hồ sơ rồi lưu lại; ranh giới đang sửa vẫn được giữ.</p>
        <div><Button key="reload" type="button" className="w-auto" variant="secondary" disabled={busy} onClick={() => { onReload(); mutation.reviewed(); }}>Tải lại hồ sơ</Button></div>
      </div>}
      <div className="mt-5 flex justify-end gap-3">
        <Button key="cancel" type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => void close()}>Bỏ qua</Button>
        <Button key="save" type="submit" className="w-auto" isPending={mutation.pending} disabled={!canSave}>Lưu ranh giới</Button>
      </div>
    </form>
  </Dialog>;
}
