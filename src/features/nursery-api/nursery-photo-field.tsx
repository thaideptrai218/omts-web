"use client";
import { PhotoPicker } from "@/components/form/photo-picker";
export type NurseryPhotoDraft = { file: File; preview: string };
/** Preserve W2 drafts while using the shared picker and compression. */
export function NurseryPhotoField({ photos, onChange, kept = [], onRemoveKept, onBusy, disabled }: {
  photos: NurseryPhotoDraft[]; onChange(photos: NurseryPhotoDraft[]): void; kept?: { id: string; url: string }[];
  onRemoveKept?(id: string): void; onBusy?(busy: boolean): void; disabled?: boolean;
}) {
  return <PhotoPicker files={photos.map(photo => photo.file)} onChange={files => onChange(files.map(file => photos.find(photo => photo.file === file) ?? { file, preview: "" }))}
    existing={kept} onRemoveExisting={onRemoveKept} onBusyChange={onBusy} disabled={disabled} />;
}
