"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { GalleryPhoto } from "./raft-live-model";

/** One gallery for the raft: photos of the seeding sessions and care logs (newest first, with source and date) then the raft's own photos. */
export function RaftPhotoGallery({ photos, rowVersion, canRemove, busy, onRemove, loadingMore }: {
  photos: readonly GalleryPhoto[]; rowVersion: string; canRemove: boolean; busy: boolean; onRemove(photo: GalleryPhoto): void; loadingMore?: boolean;
}) {
  if (!photos.length) return <p className={styles.hint}>{loadingMore ? "Đang tải ảnh…" : "Chưa có ảnh bè."}</p>;
  return <>
    <ul className="grid gap-3 sm:grid-cols-3" aria-label="Ảnh bè">{photos.map(photo => <li key={photo.id} className="min-w-0">
      <a href={photo.url} target="_blank" rel="noreferrer" className={styles.link}>
        <Image key={photo.raftPhotoId ? rowVersion : photo.id} src={photo.url} alt={photo.caption} width={600} height={400} unoptimized className="max-h-48 w-full rounded-control object-contain" />Xem ảnh gốc</a>
      <p className="text-xs text-text-muted">{photo.source}{photo.date ? ` · ${formatVietnameseDate(photo.date)}` : ""}</p>
      {canRemove && photo.raftPhotoId && <Button key={`delete-photo-${photo.raftPhotoId}`} type="button" variant="ghost" className="mt-1 w-auto" disabled={busy} onClick={() => onRemove(photo)}>Xóa ảnh {photo.sortOrder}</Button>}
    </li>)}</ul>
    {loadingMore && <p className={styles.hint}>Đang tải thêm ảnh từ thả giống và nhật ký…</p>}
  </>;
}
