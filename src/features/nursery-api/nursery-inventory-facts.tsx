import { quantityText, type NurseryDetail } from "./contracts";

const NURSING = 4001, CANCELLED = 4003;
const ESTIMATE = "Số ước tính: sống sót đếm bằng mắt khi hoàn tất ươm";
const share = (part: number, whole: number) => whole > 0 ? Math.min(100, part / whole * 100) : 0;
const percentText = (value: number) => `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;

function Figure({ label, value, title, strong }: { label: string; value: string; title?: string; strong?: boolean }) {
  return <div className="min-w-0 rounded-control border border-border px-3 py-2">
    <dt className="text-xs text-text-muted" title={title}>{label}</dt>
    <dd className={`mt-0.5 truncate tabular-nums ${strong ? "text-base font-semibold" : "text-sm font-medium"}`}>{value}</dd>
  </div>;
}

/**
 * "Kho ươm" read as a path: Vào ươm → Sống sót* → Đã thả → Còn lại, then a bar of what is already seeded out of the survivors. The loss is a secondary line because it is an
 * estimate (the survivors are counted by eye). A batch still nursing or cancelled has no survivors yet, so only what went in is shown, with a one-line hint.
 */
export function NurseryInventoryFacts({ batch }: { batch: NurseryDetail }) {
  if (batch.statusId === NURSING || batch.statusId === CANCELLED || batch.survivors == null) {
    return <section aria-label="Kho ươm" className="mt-4">
      <h4 className="mb-2 text-sm font-semibold">Kho ươm</h4>
      <dl className="grid max-w-xs grid-cols-1 gap-2"><Figure label="Vào ươm" value={quantityText(batch.quantityIn)} strong /></dl>
      <p className="mt-2 text-xs text-text-muted">{batch.statusId === CANCELLED ? "Đợt đã hủy: số mảnh đã trả về lô giống." : "Số sống sót có khi bấm Hoàn tất ươm."}</p>
    </section>;
  }
  const survivors = batch.survivors, seededShare = share(batch.seeded, survivors);
  const loss = Math.max(0, batch.quantityIn - survivors) + (batch.closeLossPieces ?? 0);
  return <section aria-label="Kho ươm" className="mt-4">
    <h4 className="mb-2 text-sm font-semibold">Kho ươm</h4>
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Figure label="Vào ươm" value={quantityText(batch.quantityIn)} />
      <Figure label="Sống sót*" title={ESTIMATE} value={quantityText(survivors)} />
      <Figure label="Đã thả" value={quantityText(batch.seeded)} />
      <Figure label="Còn lại" value={quantityText(batch.remaining)} strong />
    </dl>
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <div role="progressbar" aria-label="Đã thả trên số sống sót" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(seededShare)}
        className="h-2 min-w-40 flex-1 overflow-hidden rounded-full bg-surface-subtle">
        <div className="h-full rounded-full bg-primary" style={{ width: `${seededShare}%` }} />
      </div>
      <span className="shrink-0 tabular-nums">Đã thả {quantityText(batch.seeded)} / {quantityText(survivors)} ({percentText(seededShare)})</span>
    </div>
    <p className="mt-2 text-xs text-text-muted" title={ESTIMATE}>
      Hao hụt*: {quantityText(loss)}{batch.quantityIn > 0 ? ` · ${percentText(loss / batch.quantityIn * 100)}` : ""}
      {batch.closeLossPieces ? ` (gồm ${quantityText(batch.closeLossPieces)} ghi hao hụt khi đóng đợt)` : ""}
    </p>
  </section>;
}
