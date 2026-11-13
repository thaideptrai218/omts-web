import Link from "next/link";
import { farmedSeedText } from "./cycle-farmed-seed";

/**
 * A cycle farms the SEED of its nursed batch (the sold "loại hàu" is derived from that seed item once, in Vật tư & Giống, and only matches orders):
 * the start and plan screens name the seed ("Giống: Hàu giống … · đợt ươm NU…"), never the sold product.
 */
export type DerivedProduct = { code?: string | null; name?: string | null; productName?: string | null; seedItemName?: string | null };

/** Start form / plan: "Giống: Hàu giống bản địa Vân Đồn 3 cm · đợt ươm NU000007". */
export const startProductText = ({ code, name, seedItemName }: DerivedProduct) => `Giống: ${farmedSeedText({ seedItemName: seedItemName ?? name, nurseryCode: code })}`;
/** The seed item has no loại hàu yet: the user sets it once in Vật tư & Giống. */
export const noProductText = (seedItemName?: string | null) => `${seedItemName ? `Giống ${seedItemName}` : "Giống của đợt ươm này"} chưa gắn loại hàu bán ra.`;

/** Read-only line under the nursed batch select; with no batch picked it shows nothing. */
export function DerivedProductNote({ batch }: { batch: DerivedProduct | undefined }) {
  if (!batch) return null;
  if (batch.productName) return <p role="status" className="mt-1 text-xs font-medium">{startProductText(batch)}</p>;
  return <p role="status" className="mt-1 text-xs text-text-muted">{noProductText(batch.seedItemName ?? batch.name)} Hãy chọn loại hàu cho giống trong <Link className="font-medium text-primary underline underline-offset-4" href="/inputs/items">Vật tư &amp; Giống</Link> rồi quay lại.</p>;
}
