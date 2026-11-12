"use client";
import { useId, useState } from "react";
import { compressNurseryPhoto, nurseryPhotoPreview } from "./compress-nursery-photo";

export type NurseryPhotoDraft = { file: File; preview: string };
export function NurseryPhotoField({ photos, onChange, kept = [], onRemoveKept, onBusy, disabled }: {
  photos: NurseryPhotoDraft[]; onChange(photos: NurseryPhotoDraft[]): void; kept?: { id: string; url: string }[];
  onRemoveKept?(id: string): void; onBusy?(busy: boolean): void; disabled?: boolean;
}) {
  const id = useId(), [busy, setBusy] = useState(false), [error, setError] = useState<string>();
  const total = kept.length + photos.length;
  async function add(files: File[]) {
    if (busy) return;
    setError(undefined);
    if (files.length + total > 3) { setError("Chỉ được chọn tối đa 3 ảnh."); return; }
    setBusy(true); onBusy?.(true);
    try {
      const added: NurseryPhotoDraft[] = [];
      for (const input of files) { const file = await compressNurseryPhoto(input); added.push({ file, preview: await nurseryPhotoPreview(file) }); }
      onChange([...photos, ...added]);
    } catch (cause) { setError(cause instanceof Error && /[À-ỹ]/.test(cause.message) ? cause.message : "Không đọc được ảnh. Hãy chọn ảnh JPEG hoặc PNG khác."); }
    finally { setBusy(false); onBusy?.(false); }
  }
  return <fieldset className="mt-3 min-w-0 rounded-control border border-border p-3" disabled={disabled || busy}>
    <legend className="px-1 text-sm font-medium">Ảnh hiện trường · {total}/3</legend>
    <label htmlFor={id} className="block text-xs text-text-muted">Chọn từ 1 đến 3 ảnh JPEG/PNG, mỗi ảnh tối đa 10 MB.</label>
    <input id={id} type="file" accept="image/jpeg,image/png" multiple className="omts-control mt-2 h-auto" disabled={total >= 3 || disabled || busy} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void add(files); }} />
    <div className="mt-2 flex flex-wrap gap-3">{kept.map(photo => <figure key={photo.id} className="w-24">
      {/* eslint-disable-next-line @next/next/no-img-element -- authenticated BFF images */}
      <img src={photo.url} alt="Ảnh bắt đầu ươm" className="h-20 w-24 rounded-control object-cover" />
      <button type="button" className="min-h-8 text-xs text-danger" onClick={() => onRemoveKept?.(photo.id)}>Xóa ảnh đã lưu</button>
    </figure>)}{photos.map((photo, index) => <figure key={`${photo.file.name}-${index}`} className="w-24">
      {/* eslint-disable-next-line @next/next/no-img-element -- local compressed preview */}
      <img src={photo.preview} alt={`Ảnh mới ${index + 1}`} className="h-20 w-24 rounded-control object-cover" />
      <button type="button" className="min-h-8 text-xs text-danger" onClick={() => onChange(photos.filter((_, at) => at !== index))}>Xóa ảnh {index + 1}</button>
    </figure>)}</div>
    {busy && <p role="status" className="text-xs">Đang nén ảnh…</p>}
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
  </fieldset>;
}
