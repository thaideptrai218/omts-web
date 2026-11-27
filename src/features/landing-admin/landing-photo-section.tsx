"use client";
import { useState } from "react";
import { compressPhoto } from "@/components/form/photo-compression";
import { Button } from "@/components/ui/button";
import type { LandingSectionName, LandingSettings } from "./contracts";

type Props = Readonly<{
  section: LandingSectionName;
  title: string;
  hint: string;
  captionLabel?: string;
  photos: LandingSettings["photos"];
  pending: boolean;
  onAdd(caption: string, file: File): Promise<boolean>;
  onRemove(id: string): void;
}>;

/** Một khu ảnh của trang giới thiệu: ảnh đang dùng, nút xóa và ô thêm ảnh mới. */
export function LandingPhotoSection({ section, title, hint, captionLabel, photos, pending, onAdd, onRemove }: Props) {
  const [caption, setCaption] = useState("");
  const [problem, setProblem] = useState<string>();
  const add = async (file: File) => {
    setProblem(undefined);
    let photo: File;
    try { photo = await compressPhoto(file); } catch { setProblem("Không đọc được ảnh này. Hãy chọn ảnh JPG hoặc PNG."); return; }
    if (await onAdd(caption.trim(), photo)) setCaption("");
  };
  return (
    <section className="space-y-3 rounded-card border border-border bg-surface p-4 sm:p-6" aria-labelledby={`landing-${section}`}>
      <div>
        <h2 id={`landing-${section}`} className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-text-muted">{hint}</p>
      </div>
      {photos.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {photos.map((photo) => (
            <li key={photo.id} className="space-y-2 rounded-card border border-border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh ký hạn ngắn qua proxy ảnh */}
              <img src={photo.url} alt={photo.caption ?? title} className="aspect-[4/3] w-full rounded object-cover" />
              {photo.caption ? <p className="text-sm">{photo.caption}</p> : null}
              <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => onRemove(photo.id)}>Xóa ảnh</Button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-text-muted">Chưa đăng ảnh. Trang giới thiệu đang dùng ảnh mặc định.</p>}
      <div className="flex flex-wrap items-end gap-3">
        {captionLabel ? (
          <label className="grid gap-1 text-sm font-medium">
            {captionLabel}
            <input className="min-h-11 w-72 max-w-full rounded-control border border-border-strong bg-surface px-3 text-base" maxLength={150} value={caption} onChange={(event) => setCaption(event.target.value)} />
          </label>
        ) : null}
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-control border border-primary px-4 text-sm font-semibold text-primary focus-within:ring-2 focus-within:ring-primary">
          {section === "Background" && photos.length ? "Đổi ảnh" : "Thêm ảnh"}
          <input
            type="file" accept="image/jpeg,image/png" className="sr-only" disabled={pending}
            onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void add(file); }}
          />
        </label>
      </div>
      {problem ? <p role="alert" className="text-sm text-danger">{problem}</p> : null}
    </section>
  );
}
