"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { compressPhoto, photoValidationMessage } from "./photo-compression";
import type { StepPhoto } from "./photo-contracts";

function LocalPreview({ file, index }: { file: File; index: number }) {
  const preview = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (preview.current) preview.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  // eslint-disable-next-line @next/next/no-img-element -- local object URL with effect cleanup
  return <img ref={preview} alt={`Ảnh mới ${index + 1}`} className="h-20 w-24 rounded-control object-cover" />;
}

export function PhotoPicker({ files, onChange, existing = [], onRemoveExisting, required = true, error, disabled, onBusyChange, label = "Ảnh hiện trường" }: {
  files: File[]; onChange(files: File[]): void; existing?: Array<Pick<Partial<StepPhoto>, "id" | "key"> & { url: string }>; onRemoveExisting?(id: string): void;
  required?: boolean; error?: string; disabled?: boolean; onBusyChange?(busy: boolean): void; label?: string;
}) {
  const id = useId(), fileInput = useRef<HTMLInputElement>(null), [busy, setBusy] = useState(false), [localError, setLocalError] = useState<string>();
  const total = existing.length + files.length;
  async function add(inputs: File[]) {
    if (busy || disabled || !inputs.length) return;
    const countError = photoValidationMessage(total + inputs.length, false);
    if (countError) { setLocalError(countError); return; }
    setLocalError(undefined); setBusy(true); onBusyChange?.(true);
    try {
      const added: File[] = [];
      for (const [index, input] of inputs.entries()) {
        try { added.push(await compressPhoto(input)); }
        catch (cause) { throw new Error(`Ảnh ${total + index + 1}: ${cause instanceof Error && /[À-ỹ]/.test(cause.message) ? cause.message : "Không đọc được ảnh JPEG/PNG. Hãy chọn ảnh khác."}`); }
      }
      onChange([...files, ...added]);
    } catch (cause) { setLocalError((cause as Error).message); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return <fieldset className="min-w-0 rounded-control border border-border p-3" disabled={disabled || busy} aria-describedby={`${id}-help${error || localError ? ` ${id}-error` : ""}`}>
    <legend className="px-1 text-sm font-medium">{label}{required ? " *" : " (tùy chọn)"} · {total}/3</legend>
    <p id={`${id}-help`} className="text-xs text-text-muted">{required ? "Chọn từ 1 đến 3" : "Tối đa 3"} ảnh JPEG/PNG, mỗi ảnh tối đa 10 MB.</p>
    <label htmlFor={id} className="sr-only">Chọn {label.toLowerCase()}</label>
    <input id={id} ref={fileInput} type="file" accept="image/jpeg,image/png" multiple className="sr-only" tabIndex={-1} disabled={total >= 3 || disabled || busy} aria-invalid={!!(error || localError)} onChange={event => { const inputs = Array.from(event.target.files ?? []); event.target.value = ""; void add(inputs); }} />
    <div className="mt-2 flex flex-wrap items-center gap-3"><Button type="button" variant="secondary" className="w-auto" disabled={total >= 3 || disabled || busy} aria-controls={id} onClick={() => fileInput.current?.click()}>{total ? "Thêm ảnh" : "Chọn ảnh"}</Button><span aria-live="polite" className="text-xs text-text-muted">{total ? `Đã chọn ${total}/3 ảnh` : "Chưa chọn ảnh"}</span></div>
    <div className="mt-2 flex flex-wrap gap-3">{existing.map((photo, index) => <figure key={photo.id ?? photo.key ?? photo.url} className="w-24">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed or BFF photo URL */}
      <img src={photo.url} alt={`Ảnh đã lưu ${index + 1}`} className="h-20 w-24 rounded-control object-cover" />
      {onRemoveExisting && <button type="button" className="min-h-8 text-xs text-danger" onClick={() => onRemoveExisting(photo.id ?? photo.key ?? photo.url)}>Xóa ảnh đã lưu {index + 1}</button>}
    </figure>)}{files.map((file, index) => <figure key={`${file.name}-${file.lastModified}-${index}`} className="w-24">
      <LocalPreview file={file} index={index} />
      <button type="button" className="min-h-8 text-xs text-danger" onClick={() => onChange(files.filter((_, at) => at !== index))}>Xóa ảnh mới {index + 1}</button>
    </figure>)}</div>
    {busy && <p role="status" className="text-xs">Đang nén ảnh…</p>}
    {(error || localError) && <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error || localError}</p>}
  </fieldset>;
}
