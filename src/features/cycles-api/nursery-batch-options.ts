import { rawNurseryBatchList } from "./contracts";
import { readCycles } from "./repository";

/** A finished nursery batch ("loại giống đã ươm") a cycle can be started from or switched to (NURSERY MODEL V2). */
export type NurseryBatchOption = { id: string; code: string; name: string | null; remaining: number };

/** Normalises the tolerant batch list: names the seed, falls back to `survivors - seeded` and drops batches whose pool is empty. */
export const availableNurseryBatches = rawNurseryBatchList.transform((value): NurseryBatchOption[] => {
  const rows = Array.isArray(value) ? value : "items" in value ? value.items : value.batches;
  return rows.map(row => ({ id: row.id, code: row.code, name: row.itemName ?? row.seedName ?? row.seedLot?.itemName ?? null,
    remaining: Math.max(0, row.remaining ?? (row.survivors ?? 0) - (row.seeded ?? 0)) })).filter(row => row.remaining > 0);
});

/** Batches finished in the zone with pieces still left in the nursery pool (read through the cycles BFF, same View permission as the cycle screens). */
export const readAvailableNurseryBatches = (zoneId: string, signal?: AbortSignal) => readCycles({ action: "nursery-available", zoneId }, availableNurseryBatches, signal);

type CycleNursery = { nurseryBatchId?: string | null; nurseryCode?: string | null; seedLot?: { itemName?: string | null } | null; nurseryRemaining?: number | null };
export const nurseryNameOf = (cycle: Pick<CycleNursery, "seedLot">) => cycle.seedLot?.itemName ?? null;
/** The batch the cycle already uses stays selectable even when its pool is empty (it is not in the "available" list then). */
export function withCurrentBatch(options: readonly NurseryBatchOption[], cycle: CycleNursery): NurseryBatchOption[] {
  if (!cycle.nurseryBatchId || options.some(option => option.id === cycle.nurseryBatchId)) return [...options];
  return [{ id: cycle.nurseryBatchId, code: cycle.nurseryCode ?? "Đợt ươm hiện tại", name: nurseryNameOf(cycle), remaining: cycle.nurseryRemaining ?? 0 }, ...options];
}

/** Nursery pieces are estimates: whole pieces only. */
export const wholePieces = (value: number) => Math.round(value).toLocaleString("vi-VN");
/** "NU000007 · Hàu giống · còn 9.500 mảnh (ước tính)": the label of a batch in the select. */
export const nurseryBatchLabel = (batch: Pick<NurseryBatchOption, "code" | "name" | "remaining">) =>
  [batch.code, batch.name, `còn ${wholePieces(batch.remaining)} mảnh (ước tính)`].filter(Boolean).join(" · ");
/** The batch a cycle was started from, as the journey and plan show it: "NU000007 · Hàu giống · kho ươm còn 9.500 mảnh". */
export const cycleNurseryText = (cycle: CycleNursery) =>
  [cycle.nurseryCode ?? "Đợt ươm", nurseryNameOf(cycle), cycle.nurseryRemaining == null ? null : `kho ươm còn ${wholePieces(cycle.nurseryRemaining)} mảnh`].filter(Boolean).join(" · ");
