import { rawProductList } from "./contracts";
import { readCycles } from "./repository";

/** A catalogue product a cycle can farm ("loại hàu nuôi", e.g. Hàu múp, Hàu gầy 3cm). */
export type ProductOption = { id: string; name: string };

/** Keeps the products in use (`inUse`, or status 101 when only the status is sent; a product with neither flag is kept) and sorts them by name. */
export const farmableProducts = rawProductList.transform((value): ProductOption[] => {
  const rows = Array.isArray(value) ? value : value.items;
  return rows.filter(row => row.inUse ?? (row.statusId == null || row.statusId === 101)).map(row => ({ id: row.id, name: row.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
});

/** In-use catalogue products, read through the cycles BFF (same View permission as the cycle screens). */
export const readFarmableProducts = (signal?: AbortSignal) => readCycles({ action: "products" }, farmableProducts, signal);

/** The product of the current cycle stays selectable even if the catalogue no longer lists it as in use. */
export function withCurrentProduct(options: readonly ProductOption[], cycle: { productId?: string | null; productName?: string | null }): ProductOption[] {
  if (!cycle.productId || options.some(option => option.id === cycle.productId)) return [...options];
  return [{ id: cycle.productId, name: cycle.productName ?? "Loại hàu hiện tại" }, ...options];
}
