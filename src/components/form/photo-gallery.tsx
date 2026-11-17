"use client";
import { EvidenceGallery } from "@/components/ui/evidence-gallery";
import type { StepPhoto } from "./photo-contracts";

export function PhotoGallery({ photos, label = "Ảnh hiện trường" }: { photos: StepPhoto[]; label?: string }) {
  if (!photos.length) return null;
  return <div className="mt-3 max-w-xl"><EvidenceGallery title={label} images={photos.map((photo, index) => ({ id: photo.id ?? photo.key ?? String(index), url: photo.url, label: `${label} ${index + 1}` }))} /></div>;
}
