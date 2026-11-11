import { z } from "zod";
import { bffClient, type ListQuery, type Query, type SaveBody } from "@/features/input-items/repository";
import * as c from "./contracts";

export { errorText, problemText, type Failure, type Result } from "@/features/input-items/repository";

const { read, json, upload, download } = bffClient("/api/products");
const removed = z.object({ done: z.literal(true) });
export type MovementQuery = { from?: string; to?: string; kind?: string; includeReversals?: string; page?: string; pageSize?: string };

export const productRepository = {
  list: (values: ListQuery, signal?: AbortSignal) => read("products", values, c.productPage, signal),
  /** The plain list of products for pickers: in use only unless the Owner asks otherwise. */
  all: (values: Query = {}, signal?: AbortSignal) => read("products-all", values, z.array(c.productRow), signal),
  detail: (id: string, signal?: AbortSignal) => read("product", { id }, c.productView, signal),
  nextCode: (signal?: AbortSignal) => read("product-next-code", {}, c.nextCode, signal),
  save: (body: SaveBody, id?: string) => json(id ? "product-update" : "product-create", { id, body }, c.productView),
  setStatus: (action: "discontinue" | "resume", id: string) => json(`product-${action}`, { id }, c.productView),
  remove: (id: string) => json("product-delete", { id }, c.removedProduct),
  addPhoto: (id: string, file: File) => upload("photo", file, c.productView, id),
  removePhoto: (id: string, photoId: string) => json("product-photo-remove", { id, photoId }, c.productView),
  import: (file: File) => upload("import", file, c.importResult),
  exportList: (values: ListQuery) => download("products-export", values, "san-pham.xlsx"),
  template: () => download("products-template", {}, "mau-san-pham.xlsx"),
  movements: (id: string, values: MovementQuery, signal?: AbortSignal) => read("movements", { id, ...values }, c.productMovementPage, signal),
  exportMovements: (id: string, values: MovementQuery) => download("movements-export", { id, ...values }, "nhap-xuat-san-pham.xlsx"),
  lots: (id: string, signal?: AbortSignal) => read("product-lots", { id }, c.productLots, signal),
  /** The price changes of the product, newest first; `unitId` (the shared unit id of a unit row) keeps one unit's. */
  priceHistory: (id: string, unitId?: string, signal?: AbortSignal) => read("price-history", { id, unitId }, z.array(c.priceChange), signal),

  groups: (signal?: AbortSignal) => read("groups", {}, c.productGroup.array(), signal),
  saveGroup: (name: string, id?: string, rowVersion?: string, parentId?: string | null) =>
    json(id ? "group-update" : "group-create", { id, body: id ? { name, rowVersion, parentId: parentId ?? null } : { name, ...(parentId ? { parentId } : {}) } }, c.productGroup),
  removeGroup: (id: string) => json("group-delete", { id }, removed),
  reorderGroups: (ids: string[]) => json("group-reorder", { body: { ids } }, c.productGroup.array()),
};

export const disposalRepository = {
  list: (values: ListQuery, signal?: AbortSignal) => read("disposals", values, c.disposalPage, signal),
  detail: (id: string, signal?: AbortSignal) => read("disposal", { id }, c.disposalView, signal),
  nextCode: (signal?: AbortSignal) => read("disposal-next-code", {}, c.nextCode, signal),
  save: (body: SaveBody, id?: string) => json(id ? "disposal-update" : "disposal-create", { id, body }, c.disposalView),
  complete: (id: string, rowVersion?: string) => json("disposal-complete", { id, body: rowVersion ? { rowVersion } : {} }, c.disposalView),
  cancel: (id: string, reason: string, rowVersion?: string) => json("disposal-cancel", { id, body: { reason, ...(rowVersion ? { rowVersion } : {}) } }, c.disposalView),
  remove: (id: string) => json("disposal-delete", { id }, removed),
  exportList: (values: ListQuery) => download("disposals-export", values, "phieu-xuat-huy-hau.xlsx"),
};
