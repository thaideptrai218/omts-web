import { farmedSeedParts, type FarmedSeedSource } from "./cycle-farmed-seed";

/** "Đang nuôi: Hàu giống bản địa Vân Đồn 3 cm · lô PN000013-1 · đợt ươm NU000007": the seed a cycle farms, never the sold product. */
export function CycleProductLine({ cycle }: { cycle: FarmedSeedSource }) {
  const { name, details } = farmedSeedParts(cycle);
  return <p className="mb-3 text-sm"><span className="text-text-muted">Đang nuôi:</span> <strong>{name}</strong>{details.length ? <span className="text-text-muted"> · {details.join(" · ")}</span> : null}</p>;
}
