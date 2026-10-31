import "server-only";
import { z } from "zod";
import * as c from "@/features/operations/new-module-contracts";
import type { OperationArea } from "@/features/operations/permissions";
import type { OperationPlan } from "./operation-plan";

const productQuery = z.strictObject({ action: z.enum(["list", "all"]).default("list") });
const requestQuery = z.strictObject({ action: z.enum(["list", "mine", "detail", "mine-detail"]).default("list"), id: z.guid().optional(),
  status: c.requestStatusSchema.optional(), page: z.string().regex(/^[1-9]\d{0,6}$/).default("1"), pageSize: z.string().regex(/^[1-9]\d?$/).default("20") });
const workforceQuery = z.strictObject({ action: z.enum(["list", "lookups", "leaves", "settings"]).default("list"), day: z.iso.date().optional() });
const mineQuery = z.strictObject({ action: z.literal("list").default("list"), from: z.iso.date(), to: z.iso.date() }).refine((v) => v.to >= v.from && Date.parse(v.to) - Date.parse(v.from) <= 62 * 86_400_000);
const mutation = z.strictObject({ action: z.string(), id: z.guid().optional(), zoneId: z.guid().optional(), body: z.unknown().default({}) });
const done = z.object({ done: z.literal(true) }), empty = z.strictObject({});

export function planNewModule(area: OperationArea, method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if (new Set(query.keys()).size !== [...query.keys()].length) return undefined;
  if (method === "POST") {
    const parsed = mutation.safeParse(input);
    if (query.size || !parsed.success) return undefined;
    const { action, id, zoneId, body } = parsed.data;
    const write = (path: string, validator: z.ZodType, schema: z.ZodType, permission: string, verb: OperationPlan["method"] = "POST", bodyless = false): OperationPlan | undefined => {
      const values = validator.safeParse(body);
      return values.success ? { area, action, path, method: verb, permission, zoneId, schema, ...(bodyless ? {} : { body: values.data }) } : undefined;
    };
    if (area === "sales-products" && !zoneId) {
      if (action === "create" && !id) return write("/api/sales-products", c.saveProductSchema, c.salesProductSchema, "Owner");
      if (action === "update" && id) { const plan = write(`/api/sales-products/${id}`, c.saveProductSchema.refine((v) => !!v.rowVersion), c.salesProductSchema, "Owner", "PUT"); return plan && { ...plan, expectedId: id }; }
    }
    if (area === "purchase-requests" && !zoneId) {
      if (action === "submit" && !id) return write("/api/me/purchase-requests", c.createRequestSchema, c.purchaseRequestSchema, "Submit");
      if (id && ["respond", "cancel"].includes(action)) {
        const plan = action === "respond" ? write(`/api/purchase-requests/${id}/response`, c.respondRequestSchema, c.purchaseRequestSchema, "Respond")
          : write(`/api/me/purchase-requests/${id}/cancel`, c.cancelRequestSchema, c.purchaseRequestSchema, "CancelMine");
        return plan && { ...plan, expectedId: id };
      }
    }
    if (area === "my-work" && !zoneId) {
      if (action === "leave" && !id) return write("/api/me/leave-requests", c.requestLeaveSchema, c.leaveSchema, "Mine");
      if (action === "cancel-leave" && id) { const plan = write(`/api/me/leave-requests/${id}`, empty, c.leaveSchema, "Mine", "DELETE", true); return plan && { ...plan, expectedId: id }; }
    }
    if (area === "workforce") {
      if (action === "assign" && !id && zoneId) return write("/api/workforce/assignments", c.assignWorkSchema, z.array(c.assignmentSchema), "Create");
      if (action === "crew" && !id && zoneId) { const plan = write("/api/workforce/crew-job", c.crewWorkSchema, done, "Edit"); return plan && { ...plan, noContent: true }; }
      if (action === "remove" && id && zoneId) { const plan = write(`/api/workforce/assignments/${id}`, empty, done, "Delete", "DELETE", true); return plan && { ...plan, noContent: true }; }
      if (["check-in", "check-out"].includes(action) && id && zoneId) {
        const plan = write(`/api/workforce/assignments/${id}/${action}`, z.strictObject({ qrCode: z.string().max(200).nullable() }), c.assignmentSchema, "AttendanceCreate"); return plan && { ...plan, expectedId: id };
      }
      if (action === "review-leave" && id && !zoneId) { const plan = write(`/api/workforce/leave-requests/${id}/review`, c.reviewLeaveSchema, c.leaveSchema, "Owner"); return plan && { ...plan, expectedId: id }; }
      if (action === "job" && !id && !zoneId) return write("/api/workforce/job-types", z.strictObject({ name: z.string().trim().min(1).max(200) }), z.object({ id: z.guid(), name: z.string() }), "Owner");
      if (action === "settings" && !id && !zoneId) return write("/api/workforce/attendance-settings", c.saveAttendanceSettingsSchema, c.attendanceSettingsSchema, "Owner");
    }
    return undefined;
  }
  if (method !== "GET") return undefined;
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
    if (!q.success || ["list", "lookups"].includes(q.data.action) !== !!q.data.day) return undefined;
    return { area, action: q.data.action, method: "GET", path: q.data.action === "list" ? `/api/workforce/assignments?day=${q.data.day}` : q.data.action === "lookups" ? `/api/workforce/lookups?day=${q.data.day}`
      : q.data.action === "leaves" ? "/api/workforce/leave-requests" : "/api/workforce/attendance-settings", permission: ["list", "lookups"].includes(q.data.action) ? "View" : "Owner",
      schema: q.data.action === "list" ? z.array(c.assignmentSchema) : q.data.action === "lookups" ? c.workforceLookupsSchema : q.data.action === "leaves" ? z.array(c.leaveSchema) : z.array(c.attendanceSettingsSchema) };
  }
  if (area === "my-work") {
    const q = mineQuery.safeParse(values);
    if (!q.success) return undefined;
    return { area, action: "list", method: "GET", path: `/api/me/workforce?from=${q.data.from}&to=${q.data.to}`, permission: "Mine", schema: c.myWorkSchema };
  }
}
