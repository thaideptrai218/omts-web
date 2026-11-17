import type { NurseryRow } from "./contracts";

export function NurseryZoneReadonly({ batch }: { batch: Pick<NurseryRow, "zoneCode" | "zoneName"> }) {
  return <dl className="mb-4 rounded-control border border-border bg-surface p-3 text-sm">
    <dt className="text-xs text-text-muted">Vùng ươm</dt>
    <dd className="mt-1 break-words font-medium">{batch.zoneCode} · {batch.zoneName}</dd>
  </dl>;
}
