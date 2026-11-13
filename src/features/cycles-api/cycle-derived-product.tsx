import Link from "next/link";

/**
 * The "loại hàu" of a cycle is DERIVED from the seed item of the nursed batch (set once in Vật tư & Giống): nobody picks it on a cycle.
 * One wording everywhere: "Loại hàu" (never "sản phẩm bán" or "loại hàu nuôi").
 */
export type DerivedProduct = { productName?: string | null; seedItemName?: string | null };

/** Start form: "Loại hàu: Hàu múp · giống Hàu giống". */
export const startProductText = ({ productName, seedItemName }: DerivedProduct) => `Loại hàu: ${productName}${seedItemName ? ` · giống ${seedItemName}` : ""}`;
/** Plan tab: "Hàu múp (theo giống Hàu giống)". */
export const planProductText = ({ productName, seedItemName }: DerivedProduct) => `${productName}${seedItemName ? ` (theo giống ${seedItemName})` : ""}`;
/** The seed item has no loại hàu yet: the user sets it once in Vật tư & Giống. */
export const noProductText = (seedItemName?: string | null) => `${seedItemName ? `Giống ${seedItemName}` : "Giống của đợt ươm này"} chưa gắn loại hàu bán ra.`;

/** Read-only line under the nursed batch select; with no batch picked it shows nothing. */
export function DerivedProductNote({ batch }: { batch: DerivedProduct | undefined }) {
  if (!batch) return null;
  if (batch.productName) return <p role="status" className="mt-1 text-xs font-medium">{startProductText(batch)}</p>;
  return <p role="status" className="mt-1 text-xs text-text-muted">{noProductText(batch.seedItemName)} Hãy chọn loại hàu cho giống trong <Link className="font-medium text-primary underline underline-offset-4" href="/inputs/items">Vật tư &amp; Giống</Link> rồi quay lại.</p>;
}
