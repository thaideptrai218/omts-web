import type { z } from "zod";
import type * as c from "./records-contracts";

type SeedingData = z.infer<typeof c.seedingList>;
const n = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/**
 * What the seeding of this cycle stands at, from the list the panel already loaded: seed hung so far and where the seed comes from
 * (the nursery batch with what is left of it, or lots bought in). The completion state sits right below, in the panel.
 */
export function SeedingSummaryStrip({ data }: { data: SeedingData }) {
  const hung = data.records.reduce((sum, record) => sum + record.quantity, 0), unit = data.records[0]?.seedLot.unit ?? "";
  const remaining = data.nurseryRemaining ?? (data.nurseryAllocated != null && data.nurserySeeded != null ? data.nurseryAllocated - data.nurserySeeded : null);
  const source = data.nurseryBatchId
    ? `${data.nurseryCode ?? "Đợt ươm"} · còn ${remaining == null ? "—" : n(remaining)} trên ${data.nurseryAllocated == null ? "—" : n(data.nurseryAllocated)} mảnh đã chuyển`
    : "Lô giống mua vào (không qua ươm)";
  return <dl aria-label="Tóm tắt thả giống của chu kỳ" className="grid gap-2 sm:grid-cols-2">
    <div className="min-w-0 rounded-control border border-border bg-surface-subtle px-3 py-2"><dt className="text-xs text-text-muted">Giống đã thả</dt><dd className="mt-0.5 text-sm font-medium">{n(hung)}{unit ? ` ${unit}` : ""}</dd></div>
    <div className="min-w-0 rounded-control border border-border bg-surface-subtle px-3 py-2"><dt className="text-xs text-text-muted">Nguồn giống</dt><dd className="mt-0.5 text-sm font-medium">{source}</dd></div>
  </dl>;
}
