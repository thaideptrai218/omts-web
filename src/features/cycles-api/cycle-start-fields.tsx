"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { PhotoPicker } from "@/components/form/photo-picker";
import { UnitField } from "@/components/form/number-fields";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Field, Note, Select, Skeleton, businessToday } from "@/features/operations/ui";
import { nurseryBatchLabel, type NurseryBatchOption } from "./nursery-batch-options";
import type { CycleStartErrors, CycleStartValues } from "./cycle-start-model";

const fieldError = (text?: string) => text ? <p role="alert" className="mt-1 text-xs text-danger">{text}</p> : null;

/** The nursed batch select with its loading, error and "nothing finished in this zone" states; the batch is the only seed source of a cycle. */
export function NurseryBatchSelect({ batches, loading, error, onReload, value, onChange, message }: { batches?: readonly NurseryBatchOption[]; loading: boolean; error?: string; onReload(): void; value: string; onChange(id: string): void; message?: string }) {
  if (loading) return <Skeleton />;
  if (error) return <><ErrorNotice error={error} /><Button key="reload-nursery-batches" type="button" variant="secondary" className="w-auto" onClick={onReload}>Tải lại đợt ươm</Button></>;
  if (!batches?.length) return <div role="status" className="space-y-2 rounded-control border border-border p-3 text-sm">
    <p className="font-medium">Chưa có đợt ươm nào đã ươm xong trong vùng này</p>
    <p className="text-text-muted">Chu kỳ nuôi chỉ bắt đầu từ một đợt ươm đã hoàn tất, còn mảnh trong kho ươm.</p>
    <Link className="font-medium text-primary underline underline-offset-4" href="/farming/nursery">Mở màn Ươm giống</Link></div>;
  return <div><Select label="Đợt ươm (loại giống đã ươm) *" required value={value} aria-invalid={!!message} onChange={event => onChange(event.target.value)}>
    <option value="">Chọn đợt ươm</option>{batches.map(batch => <option key={batch.id} value={batch.id}>{nurseryBatchLabel(batch)}</option>)}</Select>{fieldError(message)}</div>;
}

/** Step 1 of the start form: raft and zone (read only), the nursed batch, the planned yield, the start date, a note and 1-3 plan photos. */
export function CycleStartFields({ raftCode, zoneLabel, values, errors, onValue, batchSelect, productSelect, photos, onPhotos, onPhotoBusy }: {
  raftCode: string; zoneLabel: string; values: CycleStartValues; errors: CycleStartErrors; onValue(key: keyof CycleStartValues, value: string): void;
  batchSelect: ReactNode; productSelect: ReactNode; photos: File[]; onPhotos(files: File[]): void; onPhotoBusy(busy: boolean): void;
}) {
  return <>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Bè nuôi" value={raftCode} readOnly /><Field label="Vùng nuôi" value={zoneLabel} readOnly /></div>
    {batchSelect}
    {productSelect}
    <div className="grid gap-3 sm:grid-cols-2">
      <div><UnitField label="Sản lượng dự kiến (kg) *" unit="kg" decimals={2} min={0.01} required value={values.targetYieldKg} onChange={value => onValue("targetYieldKg", value)}
        hint="Tổng sản lượng giống này dự kiến thu về" error={errors.targetYieldKg} /></div>
      <div><Field label="Ngày bắt đầu *" type="date" required max={businessToday()} value={values.startDate} aria-invalid={!!errors.startDate} onChange={event => onValue("startDate", event.target.value)} />{fieldError(errors.startDate)}</div>
    </div>
    <Note label="Ghi chú" maxLength={1000} value={values.note} onChange={event => onValue("note", event.target.value)} />
    <PhotoPicker label="Ảnh kế hoạch" files={photos} onChange={onPhotos} onBusyChange={onPhotoBusy} error={errors.photos} />
  </>;
}
