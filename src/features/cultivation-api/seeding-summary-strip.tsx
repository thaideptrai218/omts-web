import type { z } from "zod";
import type * as c from "./records-contracts";
import { formatVietnameseDate } from "@/shared/format/date-only";

type SeedingData = z.infer<typeof c.seedingList>;
const n = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/** Shared nursery balance and this cycle's consumption describe different scopes. */
export function SeedingSummaryStrip({ data }: { data: SeedingData }) {
  const hung = data.nurserySeeded ?? data.records.reduce((sum, record) => sum + record.quantity, 0), unit = data.nurseryBatchId ? "mảnh (ước tính)" : data.records[0]?.seedLot.unit ?? "";
  const remaining = data.nurseryRemaining;
  const source = data.nurseryBatchId
    ? `Đợt ươm ${data.nurseryCode ?? "—"} · kho ươm còn ${remaining == null ? "—" : n(remaining)} mảnh (ước tính)`
    : "Không qua ươm";
  const facts = [
    ["Nguồn giống", source], ["Đã thả trong chu kỳ", `${n(hung)}${unit ? ` ${unit}` : ""}`],
    ["Làn đã thả", `${data.seededCount}/${data.laneCount} làn`],
    ["Trạng thái thả giống", data.seedingCompletedOn ? `Hoàn tất ngày ${formatVietnameseDate(data.seedingCompletedOn)}` : "Chưa hoàn tất thả giống"],
  ];
  return <dl aria-label="Tóm tắt thả giống của chu kỳ" className="mb-3 grid gap-2 sm:grid-cols-2">
    {facts.map(([label, value]) => <div key={label} className="min-w-0 rounded-control border border-border bg-surface-subtle px-3 py-2"><dt className="text-xs text-text-muted">{label}</dt><dd className="mt-0.5 text-sm font-medium">{value}</dd></div>)}
  </dl>;
}
