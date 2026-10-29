import "server-only";
import { z } from "zod";
import * as c from "@/features/operations/contracts";
import { operationAreas, type OperationArea } from "@/features/operations/permissions";

const id = z.guid(), empty = z.strictObject({});
const querySchema = z.strictObject({ action: z.string().default("list"), id: id.optional(), zoneId: id.optional(), supplierId: id.optional(), receiptId: id.optional(),
  raftId: id.optional(), itemId: id.optional(), itemGroup: z.enum(["Seed", "RaftMaterial", "Other"]).optional(), method: c.paymentMethod.optional(),
  statusId: z.string().regex(/^[1-9]\d{2,3}$/).optional(), status: z.enum(["Draft", "Confirmed", "Corrected", "Voided", "All"]).optional(),
  from: z.iso.date().optional(), to: z.iso.date().optional(), code: z.string().max(100).optional(), groupBy: z.enum(["day", "month"]).optional(),
  page: z.string().regex(/^[1-9]\d{0,6}$/).optional(), pageSize: z.string().regex(/^[1-9]\d{0,2}$/).refine((v) => Number(v) <= 100).optional(),
  index: z.string().regex(/^\d{1,3}$/).optional() });
const mutationSchema = z.strictObject({ action: z.string(), id: id.optional(), zoneId: id.optional(), body: z.unknown().default({}) });
export type OperationPlan = { area: OperationArea; action: string; path: string; method: "GET" | "POST" | "PUT" | "DELETE";
  permission: string; zoneId?: string; body?: unknown; schema: z.ZodType; file?: "export" | "invoice" | "photo"; index?: number };

export function planOperation(areaName: string, method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  const area = z.enum(operationAreas).safeParse(areaName);
  if (!area.success) return undefined;
  const names = [...query.keys()];
  if (new Set(names).size !== names.length) return undefined;
  const q = querySchema.safeParse(Object.fromEntries(query));
  if (!q.success || q.data.from && q.data.to && q.data.from > q.data.to) return undefined;
  const key = area.data;
  const make = (action: string, path: string, schema: z.ZodType, permission = "View", verb: OperationPlan["method"] = "GET", body?: unknown): OperationPlan =>
    ({ area: key, action, path, method: verb, permission, zoneId: q.data.zoneId, schema, ...(body === undefined ? {} : { body }) });
  const filtered = (path: string, allowed: string[]) => {
    const values = new URLSearchParams();
    for (const name of allowed) if (query.has(name)) values.set(name, query.get(name)!);
    return path + (values.size ? `?${values}` : "");
  };
  if (method === "GET") {
    const { action, id: recordId, zoneId, supplierId } = q.data;
    if (key === "purchase-receipts") {
      const path = "/api/purchase-receipts";
      const listPath = (suffix = "") => filtered(path + suffix, ["itemGroup", "itemId", "zoneId", "raftId", "supplierId", "statusId", "from", "to", "code", "page", "pageSize"]);
      if (action === "list") return make(action, listPath(), c.receiptSearchSchema);
      if (action === "detail" && recordId) return make(action, `${path}/${recordId}`, c.receiptSchema);
      if (action === "return-detail" && recordId) return make(action, `/api/purchase-returns/${recordId}`, c.returnSchema);
      if (action === "returns" && recordId) return make(action, `${path}/${recordId}/returns`, z.array(c.receiptSchema.shape.returns.element));
      if (action === "costs") return make(action, listPath("/raft-material-costs"), c.raftCostsSchema);
      if (action === "export") return { ...make(action, listPath("/export"), empty, "Export"), file: "export" };
      if (action === "invoice" && recordId && q.data.index !== undefined) return { ...make(action, `${path}/${recordId}`, c.receiptSchema), file: "invoice", index: Number(q.data.index) };
    }
    if (key === "supplier-payments") {
      if (action === "list") return make(action, filtered("/api/supplier-payments", ["supplierId", "receiptId", "zoneId", "method", "statusId", "from", "to", "page", "pageSize"]), c.paymentSearchSchema);
      if (action === "debts") return make(action, "/api/suppliers/debts", c.debtsSchema);
      if (action === "debt" && supplierId) return make(action, `/api/suppliers/${supplierId}/debt`, c.debtSchema);
    }
    if (key === "water") {
      const path = `/api/zones/${zoneId}/water-measurements`;
      if (action === "list" && zoneId) return make(action, filtered(path, ["from", "to", "status", "page", "pageSize"]), c.waterHistorySchema);
      if (action === "detail" && recordId) return make(action, `/api/water-measurements/${recordId}`, c.waterSchema);
      if (action === "photo" && recordId) return { ...make(action, `/api/water-measurements/${recordId}`, c.waterSchema), file: "photo" };
      if (action === "chart" && zoneId) return make(action, filtered(path + "/chart", ["from", "to", "groupBy"]), c.waterChartSchema);
      if (action === "thresholds") return make(action, zoneId ? `/api/zones/${zoneId}/water-thresholds` : "/api/water-thresholds", zoneId ? c.zoneThresholdsSchema : z.array(c.zoneThresholdsSchema));
      if (action === "export" && zoneId) return { ...make(action, filtered(path + "/export", ["from", "to", "status"]), empty, "Export"), file: "export" };
    }
    return undefined;
  }
  if (method !== "POST" || query.size) return undefined;
  const mutation = mutationSchema.safeParse(input);
  if (!mutation.success) return undefined;
  const { action, id: recordId, zoneId, body } = mutation.data;
  const write = (path: string, validator: z.ZodType, schema: z.ZodType, permission: string, verb: OperationPlan["method"] = "POST", bodyless = false) => {
    const parsed = validator.safeParse(body);
    return parsed.success ? { ...make(action, path, schema, permission, verb, bodyless ? undefined : parsed.data), zoneId } : undefined;
  };
  if (key === "purchase-receipts") {
    const path = `/api/purchase-receipts${recordId ? `/${recordId}` : ""}`;
    if (action === "create" && !recordId) {
      const result = write(path, c.saveReceiptSchema, c.receiptSchema, "Create");
      return result ? { ...result, zoneId: (result.body as z.infer<typeof c.saveReceiptSchema>).zoneId } : undefined;
    }
    if (!recordId) return undefined;
    if (action === "update") {
      const result = write(path, c.saveReceiptSchema.refine((v) => v.rowVersion !== null), c.receiptSchema, "Edit", "PUT");
      return result ? { ...result, zoneId: (result.body as z.infer<typeof c.saveReceiptSchema>).zoneId } : undefined;
    }
    if (action === "complete") return write(path + "/complete", c.completeReceiptSchema, c.receiptSchema, "Edit");
    if (action === "cancel") return write(path + "/cancel", c.cancelReceiptSchema, c.receiptSchema, "Delete");
    if (action === "copy") return write(path + "/copy", empty, c.receiptSchema, "Create", "POST", true);
    if (action === "return") return write(path + "/returns", c.saveReturnSchema, c.receiptSchema, "Create");
  }
  if (key === "supplier-payments") {
    if (action === "record" && !recordId) return write("/api/supplier-payments", c.recordPaymentSchema, c.paymentSchema, "Create");
    if (action === "allocate" && recordId) return write(`/api/supplier-payments/${recordId}/allocate`, c.allocatePaymentSchema, c.paymentSchema, "Create");
  }
  if (key === "water") {
    if (action === "record" && zoneId) return write(`/api/zones/${zoneId}/water-measurements`, c.recordWaterSchema, c.waterSchema, "Create");
    if (action === "set-thresholds") return write(zoneId ? `/api/zones/${zoneId}/water-thresholds` : "/api/water-thresholds", c.setThresholdsSchema,
      zoneId ? c.zoneThresholdsSchema : z.array(c.zoneThresholdsSchema), "Thresholds", "PUT");
    if (!recordId) return undefined;
    const path = `/api/water-measurements/${recordId}`;
    if (action === "confirm") return write(path + "/confirm", c.confirmWaterSchema, c.waterSchema, "Create");
    if (action === "correct") return write(path + "/corrections", c.correctWaterSchema, c.waterSchema, "Edit");
    if (action === "void") return write(path + "/void", c.voidWaterSchema, c.waterSchema, "Edit");
    if (action === "recognize-again") return write(path + "/recognize", empty, c.recognitionSchema, "Create", "POST", true);
    if (action === "editing") return write(path + "/editing", empty, c.editingSchema, "Edit", "POST", true);
    if (action === "stop-editing") return write(path + "/editing", empty, z.object({ stopped: z.literal(true) }), "Edit", "DELETE", true);
  }
  return undefined;
}
