/** "Đang nuôi: Hàu múp · giống từ NU000007": what a cycle farms and the nursery batch its seed came from; nothing for a cycle without a product. */
export function CycleProductLine({ productName, nurseryCode }: { productName?: string | null; nurseryCode?: string | null }) {
  if (!productName) return null;
  return <p className="mb-3 text-sm"><span className="text-text-muted">Đang nuôi:</span> <strong>{productName}</strong>{nurseryCode ? <span className="text-text-muted"> · giống từ {nurseryCode}</span> : null}</p>;
}
