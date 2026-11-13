"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { NurseryDetail } from "./contracts";

export function NurseryPhotoGallery({ batch }: { batch: NurseryDetail }) {
  const [selected, setSelected] = useState<{ url: string; label: string }>();
  return <div className="grid gap-4 sm:grid-cols-2">
    {([["Ảnh bắt đầu ươm", batch.startPhotos], ["Ảnh hoàn tất ươm", batch.completionPhotos]] as const).map(([label, photos]) => <section key={label}>
      <h4 className="mb-2 text-sm font-medium">{label} · {photos.length}</h4>
      {!photos.length ? <p className="text-xs text-text-muted">Không có ảnh được ghi nhận.</p> : <div className="grid max-w-sm grid-cols-3 gap-2">{photos.map((photo, index) => <button key={photo.id} type="button"
        aria-label={`Xem lớn ${label.toLowerCase()} ${index + 1}`} className="overflow-hidden rounded-control border border-border focus-visible:outline-2 focus-visible:outline-primary"
        onClick={() => setSelected({ url: photo.url, label: `${label} ${index + 1}` })}>
        {/* eslint-disable-next-line @next/next/no-img-element -- authenticated BFF image */}
        <img src={photo.url} alt={`${label} ${index + 1}`} loading="lazy" className="aspect-square w-full object-cover" />
      </button>)}</div>}
    </section>)}
    {selected && <Dialog open size="lg" title={selected.label} onOpenChange={open => { if (!open) setSelected(undefined); }}>
      <p className="mb-3 text-xs text-text-muted">Vùng ươm: {batch.zoneCode} · {batch.zoneName}</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- authenticated BFF image */}
      <img src={selected.url} alt={selected.label} className="max-h-[70dvh] w-full object-contain" />
      <div className="mt-3 flex justify-end"><Button key="close-nursery-photo" type="button" variant="secondary" className="w-auto" onClick={() => setSelected(undefined)}>Đóng ảnh</Button></div>
    </Dialog>}
  </div>;
}
