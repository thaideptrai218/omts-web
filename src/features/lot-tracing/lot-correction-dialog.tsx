"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Field, Note, Skeleton, useRemote } from "@/features/operations/ui";
import { corrected, lotPhotoKeys, preview, type LotItem } from "./correction-contracts";
import { CorrectionConfirmStep, previewRows, type DiffRow } from "./correction-confirm-step";
import { buildLot, lotDraftOf, maxPhotos } from "./correction-draft";
import { PhotoKeeper } from "./photo-keeper";
import { useCorrectionFlow } from "./use-correction-flow";
import { formatDateTime } from "./trace-format";
import s from "./lot-tracing.module.css";

const repo = createOperationsRepository("lot-tracing");
type Props = { item: LotItem; onClose(): void; onSaved(published: string[]): void };

/** Sửa dữ liệu thu hoạch của lô thuộc chu kỳ đã đóng (TRACE-03.2). Ngày giờ thu hoạch không bao giờ đổi. */
export function LotCorrectionDialog({ item, onClose, onSaved }: Props) {
  const photos = useRemote(useCallback((signal: AbortSignal) => repo.read("lot-photos", { id: item.id }, lotPhotoKeys, signal), [item.id]));
  return (
    <section aria-label={`Sửa dữ liệu thu hoạch lô ${item.lotCode}`}>
      <div className={s.dialogBody}>
        {photos.loading && <Skeleton />}
        <ErrorNotice error={photos.error} />
        {photos.error && <Button type="button" className="w-auto" variant="secondary" onClick={photos.reload}>Tải lại</Button>}
        {photos.data && <LotForm item={item} photoKeys={[...photos.data.photos].sort((a, b) => a.sortOrder - b.sortOrder).map((p) => p.key)} onClose={onClose} onSaved={onSaved} />}
      </div>
    </section>
  );
}

function LotForm({ item, photoKeys, onClose, onSaved }: Props & { photoKeys: string[] }) {
  const [draft, setDraft] = useState(() => lotDraftOf(item, photoKeys));
  const flow = useCorrectionFlow({
    build: () => buildLot(draft),
    preview: (value) => repo.write("lot-preview", value, preview, item.id),
    save: (value, ownerApproved) => repo.upload("lot-trace-correct", draft.files, { ...value, rowVersion: item.rowVersion, ownerApproved }, corrected, item.id),
  }, onSaved);
  const busy = flow.mutation.pending;
  const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));

  if (flow.reviewed) {
    // Ảnh mới không có trong phần xem trước của backend; hiển thị thêm một hàng để người sửa biết.
    const rows: DiffRow[] = previewRows(flow.reviewed.preview);
    if (draft.files.length) rows.push({ label: "Ảnh thêm mới", before: "—", after: `${draft.files.length} ảnh` });
    return <CorrectionConfirmStep rows={rows} preview={flow.reviewed.preview} pending={busy} error={flow.mutation.error} onBack={flow.back} onConfirm={() => void flow.confirm()} />;
  }
  return (
    <form onSubmit={(event) => { event.preventDefault(); void flow.review(); }}>
      <p className={s.hint}>Ngày giờ thu hoạch: <strong>{formatDateTime(item.harvestedAt)}</strong> (không sửa được).</p>
      <div className={s.formGrid}>
        <Field label="Làn thu hoạch (cách nhau bởi dấu phẩy)" required value={draft.lanes} disabled={busy} onChange={(e) => set({ lanes: e.target.value })} />
        <Field label="Làn đã thu xong" value={draft.finished} disabled={busy} onChange={(e) => set({ finished: e.target.value })} />
        <Field label="Số lồng" inputMode="numeric" required value={draft.cageCount} disabled={busy} onChange={(e) => set({ cageCount: e.target.value })} />
        <Field label="kg ước tính (để trống: tính lại theo số lồng)" inputMode="decimal" value={draft.estimatedKg} disabled={busy} onChange={(e) => set({ estimatedKg: e.target.value })} />
      </div>
      <PhotoKeeper existing={photoKeys} keep={draft.keep} files={draft.files} max={maxPhotos} min={0} disabled={busy} onChange={(next) => set(next)} />
      <Note label="Lý do sửa" required maxLength={1000} value={draft.reason} disabled={busy} onChange={(e) => set({ reason: e.target.value })} />
      <ErrorNotice error={flow.mutation.error} />
      {!flow.built.ok && <p className={s.hint}>{flow.built.problem}</p>}
      <div className={s.dialogActions}>
        <Button key="discard-correction" type="button" className="w-auto" variant="secondary" disabled={busy} onClick={onClose}>Bỏ qua</Button>
        <Button key="review-correction" className="w-auto" type="submit" disabled={!flow.built.ok} isPending={busy} pendingLabel="Đang kiểm tra...">Xem lại thay đổi</Button>
      </div>
    </form>
  );
}
