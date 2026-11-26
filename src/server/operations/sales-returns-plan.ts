import "server-only";
import { z } from "zod";
import * as c from "@/features/sales-returns/return-contracts";
import type { OperationPlan } from "./operation-plan";

const area = "sales-returns" as const, id = z.guid();
/** The filters of the Trả hàng bán list, as the API takes them: the return date range, customer, zone, status (4101 recorded, 4102 cancelled) and a text matched on the return, invoice and customer. */
const filters = {
  from: z.iso.date().optional(), to: z.iso.date().optional(), customerId: id.optional(), zoneId: id.optional(), statusId: z.enum(["4101", "4102"]).optional(),
  search: z.string().trim().min(1).max(100).optional(), sort: z.enum(c.returnSorts).optional(), sortDir: z.enum(["asc", "desc"]).optional(),
};
const filterNames = Object.keys(filters) as (keyof typeof filters)[];
const readQuery = z.strictObject({
  action: z.enum(["list", "export", "detail", "preview"]), id: id.optional(), ...filters,
  page: z.string().regex(/^[1-9]\d{0,6}$/).optional(), pageSize: z.enum(["10", "15", "30", "50", "100"]).optional(),
});
const writeInput = z.strictObject({ action: z.enum(["create", "cancel"]), id, zoneId: z.undefined().optional(), body: z.unknown().default({}) });

/**
 * BFF plan for Trả hàng bán (CLAIM-03, SCR-CLAIM-03).
 * Permission (plan.permission): View = SALES_RETURNS View (list, detail; the file takes View as well, the function has no Export), Create = the preview and the save of a return,
 * Delete = cancel (the API lets only the Cooperative Owner cancel). `preview` and `create` take the id of the INVOICE; `detail` and `cancel` take the id of the return.
 */
export function salesReturnsPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if (new Set(query.keys()).size !== query.size) return;
  if (method === "GET") {
    if (input !== undefined) return;
    const parsed = readQuery.safeParse(Object.fromEntries(query));
    if (!parsed.success) return;
    const q = parsed.data, base = { area, action: q.action, method: "GET" as const };
    const only = (names: readonly string[]) => [...query.keys()].every((name) => name === "action" || names.includes(name));
    if (q.action === "detail") return q.id && only(["id"]) ? { ...base, path: `/api/sales-returns/${q.id}`, permission: "View", schema: c.returnView, expectedId: q.id } : undefined;
    if (q.action === "preview") {
      // The customer profile is chosen only for a walk-in invoice; the API refuses it for any other.
      const customer = q.customerId ? `?${new URLSearchParams({ customerId: q.customerId })}` : "";
      return q.id && only(["id", "customerId"]) ? { ...base, path: `/api/sales-invoices/${q.id}/sales-return/preview${customer}`, permission: "Create", schema: c.returnPreview } : undefined;
    }
    if (q.id || q.from && q.to && q.from > q.to || !only([...filterNames, ...(q.action === "list" ? ["page", "pageSize"] : [])])) return;
    const params = new URLSearchParams();
    for (const name of filterNames) if (q[name] !== undefined) params.set(name, q[name]);
    if (q.action === "list") { params.set("page", q.page ?? "1"); params.set("pageSize", q.pageSize ?? "10"); }
    const path = `/api/sales-returns${q.action === "export" ? "/export" : ""}${params.size ? `?${params}` : ""}`;
    return q.action === "export" ? { ...base, path, zoneId: q.zoneId, permission: "View", schema: z.strictObject({}), file: "export" } : { ...base, path, zoneId: q.zoneId, permission: "View", schema: c.returnPage };
  }
  const parsed = writeInput.safeParse(input);
  if (method !== "POST" || query.size || !parsed.success) return;
  const { action, id: targetId, body } = parsed.data, base = { area, action, method: "POST" as const };
  if (action === "create") {
    const values = c.createReturnBody.safeParse(body);
    return values.success ? { ...base, path: `/api/sales-invoices/${targetId}/sales-return`, permission: "Create", body: values.data, schema: c.returnSaved } : undefined;
  }
  const values = c.cancelReturnBody.safeParse(body);
  return values.success ? { ...base, path: `/api/sales-returns/${targetId}/cancel`, permission: "Delete", body: values.data, schema: c.returnView } : undefined;
}
