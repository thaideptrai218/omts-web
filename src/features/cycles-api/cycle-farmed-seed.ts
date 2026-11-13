/**
 * What a raft really farms is the SEED the cooperative bought and nursed, not the product it is sold as (owner feedback 13/11/2026:
 * "Hàu sống loại nhỏ" says nothing about which lot). One wording everywhere: "<tên giống> · lô <mã lô giống> · đợt ươm <mã đợt>".
 * The sold product only matters when an order is matched to the raft, never in an "Đang nuôi" label.
 */
export type FarmedSeedSource = {
  seedItemName?: string | null;
  seedLot?: { code?: string | null; itemName?: string | null } | null;
  nurseryCode?: string | null;
};

export const unknownSeedText = "Chưa xác định giống";
const clean = (text?: string | null) => text?.trim() || null;

/** Name of the seed item: the cycle's own `seedItemName`, else the item name of its seed lot; null when neither is known (a legacy cycle). */
export const farmedSeedName = (source: FarmedSeedSource | null | undefined) => clean(source?.seedItemName) ?? clean(source?.seedLot?.itemName);

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
