"use client";
import { useEffect, useId, useRef, useState } from "react";
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
  return <img ref={preview} alt={`Ảnh mới ${index + 1}`} className="size-full object-cover" />;
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
  const tile = "relative size-16 overflow-hidden rounded-control border border-border";
  const remove = "absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-black/65 text-sm leading-none text-white";
  return <fieldset className="min-w-0 self-start rounded-control border border-dashed border-border bg-surface-subtle p-3" disabled={disabled || busy} aria-describedby={`${id}-help${error || localError ? ` ${id}-error` : ""}`}>
    <legend className="px-1 text-sm font-medium">{label}{required ? " *" : " (tùy chọn)"} · {total}/3</legend>
    <label htmlFor={id} className="sr-only">Chọn {label.toLowerCase()}</label>
    <input id={id} ref={fileInput} type="file" accept="image/jpeg,image/png" multiple className="sr-only" tabIndex={-1} disabled={total >= 3 || disabled || busy} aria-invalid={!!(error || localError)} onChange={event => { const inputs = Array.from(event.target.files ?? []); event.target.value = ""; void add(inputs); }} />
    <div className="flex flex-wrap gap-2">{existing.map((photo, index) => <figure key={photo.id ?? photo.key ?? photo.url} className={tile}>
      {/* eslint-disable-next-line @next/next/no-img-element -- signed or BFF photo URL */}
      <img src={photo.url} alt={`Ảnh đã lưu ${index + 1}`} className="size-full object-cover" />
      {onRemoveExisting && <button type="button" className={remove} aria-label={`Xóa ảnh đã lưu ${index + 1}`} title="Xóa ảnh" onClick={() => onRemoveExisting(photo.id ?? photo.key ?? photo.url)}>×</button>}
    </figure>)}{files.map((file, index) => <figure key={`${file.name}-${file.lastModified}-${index}`} className={tile}>
      <LocalPreview file={file} index={index} />
      <button type="button" className={remove} aria-label={`Xóa ảnh mới ${index + 1}`} title="Bỏ ảnh" onClick={() => onChange(files.filter((_, at) => at !== index))}>×</button>
    </figure>)}
      {total < 3 && <button type="button" className="grid size-16 place-items-center rounded-control border border-dashed border-border bg-surface text-xs font-semibold text-primary disabled:opacity-50" disabled={disabled || busy} aria-controls={id} onClick={() => fileInput.current?.click()}>+ Ảnh</button>}
    </div>
    <p id={`${id}-help`} className="mt-2 text-xs text-text-muted">{required ? "Chọn từ 1 đến 3" : "Tối đa 3"} ảnh JPEG hoặc PNG, mỗi ảnh 10 MB.</p>
    {busy && <p role="status" className="text-xs">Đang nén ảnh…</p>}
    {(error || localError) && <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error || localError}</p>}
  </fieldset>;
}
