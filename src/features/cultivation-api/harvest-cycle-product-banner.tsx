/** "Đang nuôi: Hàu múp · đợt ươm NU000007": the oyster the raft farms, shown where a harvest is recorded. Nothing for a legacy cycle without a product. */
export function HarvestCycleProductBanner({ productName, nurseryCode }: { productName?: string | null; nurseryCode?: string | null }) {
  if (!productName) return null;
  return <p role="status" className="mb-3 flex flex-wrap items-baseline gap-x-2 rounded-control border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
    <span className="text-text-muted">Đang nuôi:</span><strong className="text-base">{productName}</strong>
    {nurseryCode ? <span className="text-text-muted">· đợt ươm {nurseryCode}</span> : null}
  </p>;
}
