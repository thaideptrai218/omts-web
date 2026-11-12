const n = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });

/**
 * Seeding from a nursery hangs the whole share transferred to the raft (owner decision of 13/11/2026), so the form shows the quantity
 * instead of asking for it: nobody chooses it, because leftovers would either stay unused or be thrown away. To change the amount the
 * owner first corrects the nursery survivors or moves pieces between rafts, then seeds.
 * @param quantity what this session hangs (the share left, plus what the session being corrected already holds); null while unknown.
 */
export function SeedingNurseryQuantitySummary({ code, quantity, allocated }: { code?: string | null; quantity: number | null; allocated?: number | null }) {
  const exhausted = quantity !== null && quantity <= 0;
  return <div className="rounded-control border border-border bg-surface-subtle px-3 py-2 text-sm sm:col-span-2" role="status">
    <p>Đợt ươm {code ?? ""} · Còn {quantity === null ? "—" : n(Math.max(0, quantity))} trên {allocated == null ? "—" : n(allocated)} mảnh đã chuyển</p>
    {exhausted
      ? <p className="mt-1 font-medium">Đã thả hết phần đã chuyển sang bè</p>
      : <p className="mt-1 font-medium">Số lượng thả: {quantity === null ? "—" : `${n(quantity)} mảnh`} · toàn bộ phần đã chuyển sang bè (không chọn số lượng)</p>}
  </div>;
}
