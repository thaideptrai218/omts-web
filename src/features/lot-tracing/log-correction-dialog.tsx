"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Field, Note } from "@/features/operations/ui";
import { logSaved, preview, type LogItem } from "./correction-contracts";
import { CorrectionConfirmStep, type DiffRow } from "./correction-confirm-step";
import { buildLog, logDraftOf, maxPhotos, type LogDraft } from "./correction-draft";
import { PhotoKeeper } from "./photo-keeper";
import { useCorrectionFlow } from "./use-correction-flow";
import { formatDay } from "./trace-format";
import s from "./lot-tracing.module.css";

const repo = createOperationsRepository("lot-tracing");
type Props = { item: LogItem; onClose(): void; onSaved(published: string[]): void };

/** So sánh nhật ký hiện tại với bản nháp. Phần xem trước của backend không có giá trị sau cho nhật ký (ảnh mới chỉ đến khi lưu). */
export function logRows(item: LogItem, draft: LogDraft): DiffRow[] {
  const rows: DiffRow[] = [];
  if (item.visitDate !== draft.visitDate) rows.push({ label: "Ngày ghi nhật ký", before: formatDay(item.visitDate), after: formatDay(draft.visitDate) });
  if ((item.notes ?? "") !== draft.notes.trim()) rows.push({ label: "Ghi chú", before: item.notes || "—", after: draft.notes.trim() || "—" });
  const removed = item.photos.filter((p) => !draft.keep.includes(p.key)).length;
  if (removed || draft.files.length) rows.push({ label: "Ảnh", before: `${item.photos.length} ảnh`, after: `${draft.keep.length + draft.files.length} ảnh (bỏ ${removed}, thêm ${draft.files.length})` });
  return rows;
}

/** Sửa nhật ký nuôi của chu kỳ đã đóng (TRACE-03.1). Nhật ký không có phiên bản: lần lưu sau cùng thắng. */
export function LogCorrectionDialog({ item, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState(() => logDraftOf(item));
  const flow = useCorrectionFlow({
    build: () => buildLog(draft),
    preview: () => repo.read("log-preview", { id: item.id }, preview),
    save: (value, ownerApproved) => repo.upload("log-trace-correct", draft.files, { ...value, ownerApproved }, logSaved, item.id),
  }, onSaved);
  const busy = flow.mutation.pending;
  const set = (patch: Partial<LogDraft>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <section aria-label={`Sửa nhật ký nuôi ${formatDay(item.visitDate)}`}>
      <div className={s.dialogBody}>
        {flow.reviewed ? (
          <CorrectionConfirmStep rows={logRows(item, draft)} preview={flow.reviewed.preview} pending={busy} error={flow.mutation.error} onBack={flow.back} onConfirm={() => void flow.confirm()} />
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); void flow.review(); }}>
            <Field label="Ngày ghi nhật ký" type="date" required value={draft.visitDate} disabled={busy} onChange={(e) => set({ visitDate: e.target.value })} />
            <Note label="Ghi chú" maxLength={2000} value={draft.notes} disabled={busy} onChange={(e) => set({ notes: e.target.value })} />
            <PhotoKeeper existing={item.photos.map((p) => p.key)} keep={draft.keep} files={draft.files} max={maxPhotos} min={1} disabled={busy} onChange={(next) => set(next)} />
            <Note label="Lý do sửa" required maxLength={1000} value={draft.reason} disabled={busy} onChange={(e) => set({ reason: e.target.value })} />
            <ErrorNotice error={flow.mutation.error} />
            {!flow.built.ok && <p className={s.hint}>{flow.built.problem}</p>}
            <div className={s.dialogActions}>
              <Button key="discard-correction" type="button" className="w-auto" variant="secondary" disabled={busy} onClick={onClose}>Bỏ qua</Button>
              <Button key="review-correction" className="w-auto" type="submit" disabled={!flow.built.ok} isPending={busy} pendingLabel="Đang kiểm tra...">Xem lại thay đổi</Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
