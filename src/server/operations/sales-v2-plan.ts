import "server-only";
import { z } from "zod";
import * as c from "@/features/sales-api/contracts";
import type { OperationPlan } from "./operation-plan";
export function salesV2Plan(area: "sales-products", method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if ([...query.keys()].length !== new Set(query.keys()).size) return;
  if (method === "GET") {
    const q = z.strictObject({ action: z.enum(["list", "all", "detail"]), id: z.guid().optional(), statusId: z.string().regex(/^\d+$/).optional() }).safeParse(Object.fromEntries(query));
    if (!q.success) return;
    const v = q.data, detail = v.action === "detail";
    if (detail !== !!v.id || detail && v.statusId) return;
    return { area, action: v.action, method: "GET", path: `/api/products${detail ? `/${v.id}` : v.statusId ? `?statusId=${v.statusId}` : ""}`, permission: v.action === "all" ? "CatalogueAll" : "View", schema: detail ? c.product : z.array(c.product), expectedId: v.id };
  }
  const parsed = z.strictObject({ action: z.enum(["create", "update", "discontinue", "resume"]), id: z.guid().optional(), zoneId: z.undefined().optional(), body: z.unknown() }).safeParse(input);
  if (method !== "POST" || query.size || !parsed.success) return;
  const { action, id, body } = parsed.data;
  if (action === "create" ? !!id : !id) return;
  if (action === "create" || action === "update") {
    const checked = c.saveProduct.safeParse(body);
    if (!checked.success || action === "update" && !checked.data.rowVersion) return;
    return { area, action, method: action === "update" ? "PUT" : "POST", path: `/api/products${id ? `/${id}` : ""}`, permission: "Owner", schema: z.object({ product: c.product }).transform(v => v.product), expectedId: id, body: checked.data };
  }
  if (!z.strictObject({}).safeParse(body).success) return;
  return { area, action, method: "POST", path: `/api/products/${id}/${action}`, permission: "Owner", schema: c.product, expectedId: id };
}
