/** "Đang nuôi: Hàu múp · đợt ươm NU000007": the loại hàu a cycle farms (derived from its seed) and the nursery batch it came from; nothing for a cycle without one. */
export function CycleProductLine({ productName, nurseryCode }: { productName?: string | null; nurseryCode?: string | null }) {
  if (!productName) return null;
  return <p className="mb-3 text-sm"><span className="text-text-muted">Đang nuôi:</span> <strong>{productName}</strong>{nurseryCode ? <span className="text-text-muted"> · đợt ươm {nurseryCode}</span> : null}</p>;
}
