/**
 * What a raft really farms is the SEED the cooperative bought and nursed, not the product it is sold as (owner feedback 13/11/2026:
 * "Hàu sống loại nhỏ" says nothing about which lot). One wording everywhere: "<tên giống> · lô <mã lô giống> · đợt ươm <mã đợt>".
 * The sold product only matters when an order is matched to the raft, never in an "Đang nuôi" label.
 */
export type FarmedSeedSource = {
  seedItemName?: string | null;
  /** A legacy cycle seeded from several seed items: the distinct names, the one with most seed first. */
  seedItemNames?: readonly string[] | null;
  seedLot?: { code?: string | null; itemName?: string | null } | null;
  nurseryCode?: string | null;
};

export const unknownSeedText = "Chưa xác định giống";
const clean = (text?: string | null) => text?.trim() || null;

/**
 * Name of the seed: several names joined by " + " for a legacy cycle seeded from more than one item, else the cycle's own `seedItemName`, else the item name of its seed lot;
 * null only when nothing is known (a cycle with no seed at all).
 */
export const farmedSeedName = (source: FarmedSeedSource | null | undefined) => {
  const names = [...new Set((source?.seedItemNames ?? []).map(clean).filter((name): name is string => !!name))];
  return names.length > 1 ? names.join(" + ") : clean(source?.seedItemName) ?? clean(source?.seedLot?.itemName) ?? names[0] ?? null;
};

/** The seed name (or "Chưa xác định giống") followed by the facts that identify it: "lô PN000013-1", "đợt ươm NU000007". */
export function farmedSeedParts(source: FarmedSeedSource | null | undefined): { name: string; details: string[] } {
  const lot = clean(source?.seedLot?.code), nursery = clean(source?.nurseryCode);
  return { name: farmedSeedName(source) ?? unknownSeedText, details: [...(lot ? [`lô ${lot}`] : []), ...(nursery ? [`đợt ươm ${nursery}`] : [])] };
}

/** "Hàu giống bản địa Vân Đồn 3 cm · lô PN000013-1 · đợt ươm NU000007". */
export function farmedSeedText(source: FarmedSeedSource | null | undefined): string {
  const { name, details } = farmedSeedParts(source);
  return [name, ...details].join(" · ");
}
