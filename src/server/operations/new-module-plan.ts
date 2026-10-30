import "server-only";
import { z } from "zod";
import * as c from "@/features/operations/new-module-contracts";
import type { OperationArea } from "@/features/operations/permissions";
import type { OperationPlan } from "./operation-plan";

const productQuery = z.strictObject({ action: z.enum(["list", "all"]).default("list") });
const requestQuery = z.strictObject({ action: z.enum(["list", "mine", "detail", "mine-detail"]).default("list"), id: z.guid().optional(),
  status: c.requestStatusSchema.optional(), page: z.string().regex(/^[1-9]\d{0,6}$/).default("1"), pageSize: z.string().regex(/^[1-9]\d?$/).default("20") });
const workforceQuery = z.strictObject({ action: z.literal("list").default("list"), day: z.iso.date() });

export function planNewModule(area: OperationArea, method: string, query: URLSearchParams): OperationPlan | undefined {
  if (method !== "GET" || new Set(query.keys()).size !== [...query.keys()].length) return undefined;
  const values = Object.fromEntries(query);
  if (area === "sales-products") {
    const q = productQuery.safeParse(values);
    if (!q.success) return undefined;
    return { area, action: q.data.action, method: "GET", path: `/api/sales-products${q.data.action === "all" ? "?includeUnavailable=true" : ""}`,
      permission: q.data.action === "all" ? "CatalogueAll" : "View", schema: z.array(c.salesProductSchema) };
  }
  if (area === "purchase-requests") {
    const q = requestQuery.safeParse(values);
    if (!q.success) return undefined;
    const mine = q.data.action.startsWith("mine"), detail = q.data.action.endsWith("detail");
    if (detail !== !!q.data.id || detail && (query.has("status") || query.has("page") || query.has("pageSize"))) return undefined;
    const path = `${mine ? "/api/me" : "/api"}/purchase-requests`;
    const search = new URLSearchParams({ page: q.data.page, pageSize: q.data.pageSize });
    if (q.data.status) search.set("status", q.data.status);
    return { area, action: q.data.action, method: "GET", path: detail ? `${path}/${q.data.id}` : `${path}?${search}`,
      permission: mine ? "Mine" : "Review", schema: detail ? c.purchaseRequestSchema : c.purchaseRequestPageSchema, expectedId: detail ? q.data.id : undefined };
  }
  if (area === "workforce") {
    const q = workforceQuery.safeParse(values);
    if (!q.success) return undefined;
    return { area, action: "list", method: "GET", path: `/api/workforce/assignments?day=${q.data.day}`, permission: "View", schema: z.array(c.assignmentSchema) };
  }
}
