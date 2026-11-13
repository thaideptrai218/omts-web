import { farmedSeedParts, type FarmedSeedSource } from "@/features/cycles-api/cycle-farmed-seed";

/** "Đang nuôi: Hàu giống bản địa Vân Đồn 3 cm · lô PN000013-1 · đợt ươm NU000007": the seed the raft farms, shown where a harvest is recorded. */
export function HarvestCycleProductBanner({ cycle }: { cycle: FarmedSeedSource }) {
  const { name, details } = farmedSeedParts(cycle);
  return <p role="status" className="mb-3 flex flex-wrap items-baseline gap-x-2 rounded-control border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
    <span className="text-text-muted">Đang nuôi:</span><strong className="text-base">{name}</strong>
    {details.length ? <span className="text-text-muted">· {details.join(" · ")}</span> : null}
  </p>;
}
