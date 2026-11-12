"use client";
import { useId, useRef, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";

/** Keep native file selection and change events, with Vietnamese copy and a keyboard-accessible trigger. */
export function ImageFileInput({ label, selectedFiles, onChange, disabled, id, ...props }: Omit<ComponentProps<"input">, "type"> & { label: string; selectedFiles?: readonly File[] }) {
  const fallback = useId(), inputId = id ?? fallback, input = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<string[]>([]);
  const displayed = selectedFiles ? selectedFiles.map(file => file.name) : names;
  return <div className="relative min-w-0 space-y-2">
    <p id={`${inputId}-label`} className="text-xs font-medium text-text-muted">{label}</p>
    <input {...props} id={inputId} ref={input} type="file" disabled={disabled} accept={props.accept ?? "image/jpeg,image/png"} className="sr-only" tabIndex={-1} aria-labelledby={`${inputId}-label`} onChange={event => {
      onChange?.(event);
      setNames(Array.from(event.target.files ?? []).map(file => file.name));
    }} />
    <div className="flex min-w-0 flex-wrap items-center gap-3"><Button type="button" variant="secondary" className="w-auto" disabled={disabled} aria-controls={inputId} onClick={() => input.current?.click()}>Chọn ảnh</Button><span aria-live="polite" className="min-w-0 break-all text-xs text-text-muted">{displayed.length ? displayed.join(", ") : "Chưa chọn ảnh"}</span></div>
  </div>;
}
