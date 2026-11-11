"use client";
import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";

/** Local photo control for farming records; the chosen files remain in the form draft. */
export function RecordPhotoPicker({ label, files, disabled, onChange }: {
  label: string; files: File[]; disabled?: boolean; onChange(files: File[]): void;
}) {
  const input = useRef<HTMLInputElement>(null), id = useId();
  return <div className="relative min-w-0 space-y-2">
    <p id={`${id}-label`} className="text-xs font-medium text-text-muted">{label}</p>
    <input ref={input} id={id} type="file" accept="image/jpeg,image/png" multiple className="sr-only" tabIndex={-1}
      aria-labelledby={`${id}-label`} disabled={disabled}
      onChange={event => { onChange(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    <Button type="button" variant="secondary" className="w-auto" disabled={disabled} aria-controls={id} onClick={() => input.current?.click()}>Chọn ảnh</Button>
    {!!files.length && <ul className="space-y-1 text-xs">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-3">
      <span className="min-w-0 break-all">{file.name}</span>
      <button type="button" className="shrink-0 text-primary underline" disabled={disabled} aria-label={`Bỏ ảnh ${file.name}`} onClick={() => onChange(files.filter((_, i) => i !== index))}>Bỏ</button>
    </li>)}</ul>}
  </div>;
}
