import type { ReactNode } from "react";
import type { z } from "zod";
import type * as c from "./records-contracts";
import { StatusPill } from "@/components/ui/management-page";
import { farmedSeedName, farmedSeedText } from "@/features/cycles-api/cycle-farmed-seed";
import { formatVietnameseDate } from "@/shared/format/date-only";

type SeedingData = z.infer<typeof c.seedingList>;
const n = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/** Shared nursery balance and this cycle's consumption describe different scopes. The completion state is a small pill here (its button sits beside "Ghi nhận thả giống"). */
export function SeedingSummaryStrip({ data }: { data: SeedingData }) {
  const hung = data.nurserySeeded ?? data.records.reduce((sum, record) => sum + record.quantity, 0), unit = data.nurseryBatchId ? "mảnh (ước tính)" : data.records[0]?.seedLot.unit ?? "";
  const remaining = data.nurseryRemaining;
  // The seed bought and nursed ("Hàu giống … · lô PN… · đợt ươm NU…"), then what is left of the nursery pool.
  const source = data.nurseryBatchId
    ? `${farmedSeedText({ ...data, nurseryCode: data.nurseryCode ?? "—" })} · kho ươm còn ${remaining == null ? "—" : n(remaining)} mảnh (ước tính)`
    : farmedSeedName(data) ? `${farmedSeedText({ ...data, nurseryCode: null })} · không qua ươm` : "Không qua ươm";
  const facts: [string, ReactNode][] = [
    ["Nguồn giống", source], ["Đã thả trong chu kỳ", `${n(hung)}${unit ? ` ${unit}` : ""}`],
    ["Làn đã thả", `${data.seededCount}/${data.laneCount} làn`],
    ["Trạng thái thả giống", data.seedingCompletedOn ? <StatusPill tone="success">Hoàn tất thả giống ngày {formatVietnameseDate(data.seedingCompletedOn)}</StatusPill> : <StatusPill>Chưa hoàn tất thả giống</StatusPill>],
  ];
  return <dl aria-label="Tóm tắt thả giống của chu kỳ" className="mb-3 grid gap-2 sm:grid-cols-2">
    {facts.map(([label, value]) => <div key={label} className="min-w-0 rounded-control border border-border bg-surface-subtle px-3 py-2"><dt className="text-xs text-text-muted">{label}</dt><dd className="mt-0.5 text-sm font-medium">{value}</dd></div>)}
  </dl>;
}
