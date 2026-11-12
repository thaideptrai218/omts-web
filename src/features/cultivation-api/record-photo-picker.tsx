"use client";
import { ImageFileInput } from "@/components/form/image-file-input";

/** Local photo control for farming records; the chosen files remain in the form draft. */
export function RecordPhotoPicker({ label, files, disabled, onChange }: {
  label: string; files: File[]; disabled?: boolean; onChange(files: File[]): void;
}) {
  return <div className="relative min-w-0 space-y-2">
    <ImageFileInput label={label} multiple selectedFiles={files} disabled={disabled}
      onChange={event => { onChange(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    {!!files.length && <ul className="space-y-1 text-xs">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-3">
      <span className="min-w-0 break-all">{file.name}</span>
      <button type="button" className="shrink-0 text-primary underline" disabled={disabled} aria-label={`Bỏ ảnh ${file.name}`} onClick={() => onChange(files.filter((_, i) => i !== index))}>Bỏ</button>
    </li>)}</ul>}
  </div>;
}
