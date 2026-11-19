"use client";
import { fmt } from "@/features/purchase-documents/document-parts";
import type { SeedLotDetail, SeedLotRow } from "./contracts";

/**
 * How much of a lot has been used, in quantities only (no derived state): the received pieces split into what is in the nursery, hung on lanes, still in stock,
 * returned to the supplier and lost or issued. The five parts add up to the received quantity (remaining = in the nursery + in stock).
 */
export const progressSegments = (lot: SeedLotRow) => [
  { key: "nursing", label: "Ươm", value: lot.nursingQty, bar: "bg-info" },
  { key: "seeded", label: "Đã thả", value: lot.seededQty, bar: "bg-success" },
  { key: "stock", label: "Còn kho", value: lot.availableQty, bar: "bg-border-strong" },
  { key: "returned", label: "Trả NCC", value: lot.returnedQty, bar: "bg-warning" },
  { key: "lost", label: "Hao/xuất", value: lot.nurseryLossQty + lot.issuedOtherQty, bar: "bg-danger" },
] as const;

/** A kg figure with "(ước tính)" when the API says it is shared between lots or not weighed yet. */
export const kgText = (lot: Pick<SeedLotRow, "figuresEstimated">, value: number) => `${fmt(value)}${lot.figuresEstimated && value > 0 ? " (ước tính)" : ""}`;

/** The compact cell of the list: a segmented bar of the received quantity and, under it, the figure of every part that is not zero. */
export function SeedLotProgressCell({ lot }: { lot: SeedLotRow }) {
  const parts = progressSegments(lot), total = parts.reduce((sum, part) => sum + part.value, 0);
  const summary = parts.filter((part) => part.value > 0).map((part) => `${part.label} ${fmt(part.value)}`).join(", ") || "Chưa dùng";
  return <div className="min-w-[200px] max-w-[280px]">
    <div role="img" aria-label={`Số nhập ${fmt(lot.receivedQty)} ${lot.unitName}: ${summary}`} className="flex h-2 w-full overflow-hidden rounded-full bg-surface-subtle ring-1 ring-border">
      {total > 0 && parts.filter((part) => part.value > 0).map((part) => <span key={part.key} className={part.bar} style={{ width: `${part.value / total * 100}%` }} title={`${part.label}: ${fmt(part.value)} ${lot.unitName}`} />)}
    </div>
    <ul className="mt-1 flex flex-wrap gap-x-2 text-[11px] leading-4 text-text-muted" aria-hidden="true">
      {parts.filter((part) => part.value > 0).map((part) => <li key={part.key} className="flex items-center gap-1 tabular-nums"><span className={`inline-block size-1.5 rounded-full ${part.bar}`} />{part.label} {fmt(part.value)}</li>)}
      {total <= 0 && <li>Chưa dùng</li>}
    </ul>
  </div>;
}

/** The chips at the top of the opened lot: what came in, what went where, what the lots gave in kg, what is left. */
export function SeedLotSummary({ lot }: { lot: SeedLotDetail }) {
  const finished = lot.nurseryBatches.filter((batch) => batch.survivors != null), survivors = finished.reduce((sum, batch) => sum + (batch.survivors ?? 0), 0);
  const nurseryNote = [finished.length ? `Ươm xong: sống ${fmt(survivors)}` : "", lot.nurseryLossQty > 0 ? `hao ${fmt(lot.nurseryLossQty)}` : ""].filter(Boolean).join(", ") || "Chưa ươm";
  const chips: { key: string; label: string; value: string; unit: string; note?: string; tone: string }[] = [
    { key: "received", label: "Đã nhập", value: fmt(lot.receivedQty), unit: lot.unitName, note: lot.returnedQty > 0 ? `Đã trả NCC ${fmt(lot.returnedQty)}` : undefined, tone: "border-l-border-strong" },
    { key: "nursing", label: "Đang ươm", value: fmt(lot.nursingQty), unit: lot.unitName, note: nurseryNote, tone: "border-l-info" },
    { key: "seeded", label: "Đã thả nuôi", value: fmt(lot.seededQty), unit: lot.unitName, tone: "border-l-success" },
    { key: "harvested", label: "Thu hoạch", value: kgText(lot, lot.harvestedKg), unit: "kg", tone: "border-l-primary" },
    { key: "sold", label: "Đã bán", value: kgText(lot, lot.soldKg), unit: "kg", note: lot.returnedFromSaleKg > 0 ? `Khách trả ${fmt(lot.returnedFromSaleKg)} kg` : undefined, tone: "border-l-primary" },
    { key: "stock", label: "Còn trong kho", value: fmt(lot.availableQty), unit: lot.unitName, note: lot.issuedOtherQty > 0 ? `Xuất khác ${fmt(lot.issuedOtherQty)}` : undefined, tone: "border-l-border-strong" },
  ];
  return <ul aria-label="Tình hình sử dụng lô giống" className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
    {chips.map((chip) => <li key={chip.key} className={`rounded-md border border-border border-l-4 bg-surface px-3 py-2 ${chip.tone}`}>
      <div className="text-[12px] text-text-muted">{chip.label}</div>
      <div className="text-[18px] font-semibold leading-6 tabular-nums">{chip.value} <span className="text-[12px] font-normal text-text-muted">{chip.unit}</span></div>
      {chip.note && <div className="text-[11px] text-text-muted">{chip.note}</div>}
    </li>)}
  </ul>;
}
