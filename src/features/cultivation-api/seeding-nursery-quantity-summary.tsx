const n = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });

/** The cycle fixes the source; the remaining pool is shared by every raft using this batch. */
export function SeedingNurseryQuantitySummary({ code, name, remaining }: { code?: string | null; name?: string | null; remaining: number | null }) {
  return <div className="rounded-control border border-border bg-surface-subtle px-3 py-2 text-sm sm:col-span-2" role="status">
    <p>Giống: {code ?? "Đợt ươm"} · {name || "—"} · kho ươm còn {remaining === null ? "—" : n(Math.max(0, remaining))} mảnh (ước tính)</p>
  </div>;
}
