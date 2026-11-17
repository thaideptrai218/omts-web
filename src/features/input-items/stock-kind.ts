/**
 * The two kinds the catalogue and the purchase documents are split into: Giống (group Seed) and Vật tư (groups Material and Other).
 * A receipt or a return has one kind and never mixes them. Pure: the screens, the links and the BFF all read it from here.
 */
export const stockKinds = ["Seed", "Supply"] as const;
export type StockKind = (typeof stockKinds)[number];
export type ItemGroupName = "Seed" | "Material" | "Other";

/** The item groups each kind holds. */
export const kindGroups: Record<StockKind, readonly ItemGroupName[]> = { Seed: ["Seed"], Supply: ["Material", "Other"] };
export const kindOfGroup = (group: string | null | undefined): StockKind => group === "Seed" ? "Seed" : "Supply";
export const isStockKind = (value: unknown): value is StockKind => value === "Seed" || value === "Supply";

type KindText = {
  /** Name of the catalogue and of the menu entries. */
  catalogue: string; receipt: string; receiptReturn: string;
  /** Lower-case noun used in sentences ("Chưa có giống nào."). */
  noun: string; itemsPath: string; receiptsPath: string; returnsPath: string;
};
export const kindText: Record<StockKind, KindText> = {
  Seed: { catalogue: "Giống", receipt: "Nhập giống", receiptReturn: "Trả giống nhập", noun: "giống", itemsPath: "/inputs/seeds", receiptsPath: "/operations/seed-receipts", returnsPath: "/operations/seed-returns" },
  Supply: { catalogue: "Vật tư", receipt: "Nhập vật tư", receiptReturn: "Trả vật tư nhập", noun: "vật tư", itemsPath: "/inputs/supplies", receiptsPath: "/operations/supply-receipts", returnsPath: "/operations/supply-returns" },
};

/** The Lô giống screen: opened on one seed lot by its code (`?code=PN000004-1`). */
export const SEED_LOTS_PATH = "/farming/seed-lots";
export const seedLotsHref = (code: string) => `${SEED_LOTS_PATH}?code=${encodeURIComponent(code)}`;

const withCode = (path: string, code?: string | null) => code ? `${path}?code=${encodeURIComponent(code)}` : path;
/** Where an item, receipt or return is opened by its code. A link that does not know the kind goes to the old address, which looks the kind up. */
export const itemHref = (code: string, group?: string | null) => withCode(group ? kindText[kindOfGroup(group)].itemsPath : "/inputs/items", code);
export const receiptHref = (code: string, kind?: StockKind | null) => withCode(kind ? kindText[kind].receiptsPath : "/operations/purchase-receipts", code);
export const returnHref = (code: string, kind?: StockKind | null) => withCode(kind ? kindText[kind].returnsPath : "/operations/purchase-returns", code);
