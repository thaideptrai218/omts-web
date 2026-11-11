import "server-only";
import { z } from "zod";
import * as c from "@/features/sales-api/contracts";
import type { OperationPlan } from "./operation-plan";
export function salesV2Plan(area: "sales-products", method: string, query: URLSearchParams): OperationPlan | undefined {
  if ([...query.keys()].length !== new Set(query.keys()).size) return;
  if (method === "GET") {
    const q = z.strictObject({ action: z.enum(["list", "all", "detail"]), id: z.guid().optional(), statusId: z.string().regex(/^\d+$/).optional() }).safeParse(Object.fromEntries(query));
    if (!q.success) return;
    const v = q.data, detail = v.action === "detail";
    if (detail !== !!v.id || detail && v.statusId) return;
    return { area, action: v.action, method: "GET", path: `/api/products${detail ? `/${v.id}` : v.statusId ? `?statusId=${v.statusId}` : ""}`, permission: v.action === "all" ? "CatalogueAll" : "View", schema: detail ? c.product : z.array(c.product), expectedId: v.id };
  }
  // The catalogue is written only through /api/products (features/products), never through this door: an update replaces every field of the product.
  return undefined;
}
