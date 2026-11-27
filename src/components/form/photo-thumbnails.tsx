"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";

/** One picture of a record: `src` is a browser-reachable address (a local preview or a BFF photo route). */
export type Thumbnail = { key: string; src: string; label: string };

/** Local previews of files the user picked; the object addresses are released when the files change or the form closes. */
export function useFilePreviews(files: readonly File[]): Thumbnail[] {
  const urls = useMemo(() => typeof URL.createObjectURL === "function" ? files.map(file => URL.createObjectURL(file)) : files.map(() => ""), [files]);
  useEffect(() => () => { if (typeof URL.revokeObjectURL === "function") urls.forEach(url => { if (url) URL.revokeObjectURL(url); }); }, [urls]);
  return files.map((file, index) => ({ key: `new-${index}-${file.name}`, src: urls[index], label: file.name }));
}

/**
 * Thumbnails in a row. A click enlarges the picture in a window; `onRemove` (forms only) adds the "x" that drops it before saving.
 */
export function PhotoThumbnails({ items, onRemove, disabled }: { items: readonly Thumbnail[]; onRemove?(key: string): void; disabled?: boolean }) {
  const [zoomed, setZoomed] = useState<Thumbnail>();
  if (!items.length) return null;
  return <>
    <ul className="flex flex-wrap gap-2" aria-label="Ảnh">{items.map(item => <li key={item.key} className="relative">
      <button type="button" className="block overflow-hidden rounded-control border border-border" aria-label={`Phóng to ${item.label}`} onClick={() => setZoomed(item)}>
        {item.src ? <Image src={item.src} alt={item.label} width={96} height={96} unoptimized className="size-24 object-cover" /> : <span className="grid size-24 place-items-center p-1 text-xs">{item.label}</span>}
      </button>
      {onRemove && <button type="button" className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-border bg-surface text-xs leading-none shadow" disabled={disabled} aria-label={`Bỏ ảnh ${item.label}`} onClick={() => onRemove(item.key)}>×</button>}
    </li>)}</ul>
    {zoomed && <Dialog open size="lg" title={zoomed.label} onOpenChange={open => { if (!open) setZoomed(undefined); }}>
      {zoomed.src && <Image src={zoomed.src} alt={zoomed.label} width={1200} height={900} unoptimized className="mx-auto max-h-[70vh] w-auto object-contain" />}
    </Dialog>}
  </>;
}
