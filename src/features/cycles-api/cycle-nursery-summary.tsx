import type { CycleFigures } from "./close-contracts";

const amount = (value: number | null | undefined) => value == null ? "—" : value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
/** Figures are apportioned by the backend for this cycle; do not sum the entire shared nursery batch. */
export function CycleNurserySummary({ nursery }: { nursery: CycleFigures["nursery"] }) {
  if (!nursery) return null;
  return <section aria-label="Tổng kết ươm" className="grid gap-2 rounded-control border border-border p-3 text-sm">
    <h4 className="font-semibold">Ươm · {nursery.batchCode}</h4>
    <dl className="grid gap-2 sm:grid-cols-3">
      <div><dt className="text-text-muted">Mảnh vào ươm (ước tính)</dt><dd>{amount(nursery.quantityIn)}</dd></div>
      <div><dt className="text-text-muted">Sống sót (ước tính)</dt><dd>{amount(nursery.survivors)} mảnh</dd></div>
      <div><dt className="text-text-muted">Hao hụt ươm (ước tính)</dt><dd>{amount(nursery.lossPieces)} mảnh · {amount(nursery.lossPercent)}%</dd></div>
    </dl>
  </section>;
}
