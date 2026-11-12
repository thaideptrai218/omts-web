import type { CycleFigures } from "./close-contracts";

const amount = (value: number | null | undefined) => value == null ? "—" : value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
/** Nursery pieces are estimates, so they show as whole pieces. */
const pieces = (value: number | null | undefined) => value == null ? "—" : Math.round(value).toLocaleString("vi-VN");
/** Nursery figures of this cycle as the backend gives them: the batch's losses shared by the pieces this cycle seeded (estimates). */
export function CycleNurserySummary({ nursery }: { nursery: CycleFigures["nursery"] }) {
  if (!nursery) return null;
  return <section aria-label="Tổng kết ươm" className="grid gap-2 rounded-control border border-border p-3 text-sm">
    <h4 className="font-semibold">Ươm · {nursery.batchCode}</h4>
    <dl className="grid gap-2 sm:grid-cols-3">
      <div><dt className="text-text-muted">Mảnh vào ươm (ước tính)</dt><dd>{pieces(nursery.quantityIn)} mảnh</dd></div>
      <div><dt className="text-text-muted">Sống sót (ước tính)</dt><dd>{pieces(nursery.survivors)} mảnh</dd></div>
      <div><dt className="text-text-muted">Hao hụt ươm (ước tính)</dt><dd>{pieces(nursery.lossPieces)} mảnh · {amount(nursery.lossPercent)}%</dd></div>
    </dl>
  </section>;
}
