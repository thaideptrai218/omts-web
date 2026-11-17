"use client";
import { useState } from "react";
import { PhotoPicker } from "@/components/form/photo-picker";
import { PhotoGallery } from "@/components/form/photo-gallery";
import { photoValidationMessage } from "@/components/form/photo-compression";
import { Button } from "@/components/ui/button";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import type { CycleView } from "./cycle-model";
import { writeCycle } from "./repository";

/** Every cycle owns 1-3 plan photos (V2); an old cycle that only shows its nursery batch's completion photos (`planPhotosFromNursery`) keeps them read only. */
export function CyclePlanPhotos({ cycle, canEdit, onSaved, onDirtyChange }: { cycle: CycleView; canEdit: boolean; onSaved(): void; onDirtyChange(dirty: boolean): void }) {
  const [editing, setEditing] = useState(false), [files, setFiles] = useState<File[]>([]), [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string>();
  const mutation = useMutation(), photos = cycle.planPhotos ?? [];
  const existing = photos.filter(photo => !removed.includes(photo.id ?? photo.key ?? photo.url));
  async function save() {
    if (busy || mutation.busy() || mutation.blocked) return;
    const problem = photoValidationMessage(existing.length + files.length, true); setError(problem);
    if (problem) return;
    const body = new FormData(); body.set("rowVersion", cycle.rowVersion);
    existing.forEach(photo => { if (photo.id) body.append("keepPhotoIds", photo.id); });
    files.forEach(file => body.append("photos", file, file.name));
    const result = await mutation.run(() => writeCycle("plan-photos", cycle.id, body));
    if (result) { setEditing(false); setFiles([]); setRemoved([]); onDirtyChange(false); onSaved(); }
  }
  const photoError = mutation.failure?.problem?.field === "Photos" ? mutation.error : undefined;
  return <section aria-label="Ảnh kế hoạch nuôi" className="my-3 grid gap-2">
    <h4 className="text-sm font-semibold">Ảnh kế hoạch nuôi</h4>
    {editing ? <>
      <PhotoPicker files={files} onChange={setFiles} existing={existing} onRemoveExisting={id => setRemoved(current => [...current, id])} disabled={mutation.pending || mutation.blocked} onBusyChange={setBusy} error={error || photoError} />
      <ErrorNotice error={mutation.error} />
      <div className="flex flex-wrap gap-2"><Button key="discard-plan-photos" type="button" className="w-auto" variant="secondary" disabled={busy || mutation.pending} onClick={() => { setEditing(false); setFiles([]); setRemoved([]); setError(undefined); onDirtyChange(false); }}>Bỏ qua</Button>
        <Button key="save-plan-photos" type="button" className="w-auto" disabled={busy || mutation.blocked} isPending={mutation.pending} onClick={() => void save()}>Lưu ảnh</Button></div>
    </> : <><PhotoGallery photos={photos} label="Ảnh kế hoạch nuôi" />
      {cycle.planPhotosFromNursery ? <p className="text-xs text-text-muted">Ảnh hoàn tất đợt ươm {cycle.nurseryCode ?? ""}.</p> : null}
      {canEdit && !cycle.planPhotosFromNursery && <Button key="edit-plan-photos" type="button" variant="secondary" className="w-auto justify-self-start" onClick={() => { setEditing(true); onDirtyChange(true); }}>Chỉnh sửa ảnh</Button>}</>}
  </section>;
}
