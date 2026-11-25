import "server-only";
import { z } from "zod";
import * as c from "@/features/operations/contracts";
import { operationAreas, type OperationArea } from "@/features/operations/permissions";
import { planNewModule } from "./new-module-plan";
import { cultivationPlan } from "./cultivation-plan";
import { cultivationRecordsPlan } from "./cultivation-records-plan";
import { jobTypesPlan } from "./job-types-plan";
import { purchasingV2Plan } from "./purchasing-v2-plan";
import { salesInvoicesPlan } from "./sales-invoices-plan";
import { customerPaymentsPlan } from "./customer-payments-plan";
import { harvestYieldPlan } from "./harvest-yield-plan";
import { salesInvoiceListPlan } from "./sales-invoice-list-plan";
import { salesReportPlan } from "./sales-report-plan";
import { dashboardPlan } from "./dashboard-plan";
import { endOfDayReportPlan } from "./end-of-day-report-plan";
import { productReportPlan } from "./product-report-plan";
import { supplierReportPlan } from "./supplier-report-plan";
import { financialReportPlan } from "./financial-report-plan";
import { salesReturnsPlan } from "./sales-returns-plan";
import { claimReportsPlan, qualityClaimsPlan } from "./quality-claims-plan";
import { waterOverviewPlan } from "./water-overview-plan";
import { lotTracingPlan } from "./lot-tracing-plan";
import { payrollPlan } from "./payroll-plan";
import { seedLotsPlan } from "./seed-lots-plan";
import { laborCostsPlan } from "./labor-costs-plan";

const id = z.guid(), empty = z.strictObject({});
const querySchema = z.strictObject({ action: z.string().default("list"), id: id.optional(), zoneId: id.optional(),
  status: z.enum(["Active", "Draft", "Confirmed", "Corrected", "Voided", "All"]).optional(), from: z.iso.date().optional(), to: z.iso.date().optional(),
  groupBy: z.enum(["day", "month"]).optional(),
  page: z.string().regex(/^[1-9]\d{0,6}$/).optional(), pageSize: z.string().regex(/^[1-9]\d{0,2}$/).refine((v) => Number(v) <= 100).optional() });
const mutationSchema = z.strictObject({ action: z.string(), id: id.optional(), zoneId: id.optional(), body: z.unknown().default({}) });
export type OperationPlan = { area: OperationArea; action: string; path: string; method: "GET" | "POST" | "PUT" | "DELETE";
  permission: string; zoneId?: string; body?: unknown; multipartFields?: boolean; schema: z.ZodType; file?: "export" | "photo"; /** Định dạng tệp xuất; bỏ trống = Excel. */ exportFormat?: "pdf"; index?: number; expectedId?: string; noContent?: boolean; /** Sent as the `Idempotency-Key` header (payroll payments): a repeat with the same key returns the first result. */ idempotencyKey?: string };

export function planOperation(areaName: string, method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  const area = z.enum(operationAreas).safeParse(areaName);
  if (!area.success) return undefined;
  if (area.data === "purchase-receipts" || area.data === "supplier-payments") return purchasingV2Plan(area.data, method, query, input);
  if (area.data === "sales-invoices") return salesInvoicesPlan(method, query, input);
  if (area.data === "customer-payments") return customerPaymentsPlan(method, query, input);
  if (area.data === "harvest-yield") return harvestYieldPlan(method, query, input);
  if (area.data === "sales-report" && query.get("action") === "dashboard") return dashboardPlan(method, query);
  if (area.data === "end-of-day-report") return endOfDayReportPlan(method, query, input);
  if (area.data === "sales-report" || area.data === "customer-report") return salesReportPlan(area.data, method, query, input);
  if (area.data === "product-report") return productReportPlan(method, query, input);
  if (area.data === "supplier-report") return supplierReportPlan(method, query, input);
  if (area.data === "financial-report") return financialReportPlan(method, query, input);
  if (area.data === "sales-invoice-list") return salesInvoiceListPlan(method, query, input);
  if (area.data === "sales-returns") return salesReturnsPlan(method, query, input);
  if (area.data === "seed-lots") return seedLotsPlan(method, query, input);
  if (area.data === "claim-reports") return claimReportsPlan(method, query, input);
  if (area.data === "quality-claims") return qualityClaimsPlan(method, query, input);
  if (area.data === "lot-tracing") return lotTracingPlan(method, query, input);
  if (area.data === "payroll" || area.data === "payroll-payments") return payrollPlan(area.data, method, query, input);
  if (area.data === "labor-costs") return laborCostsPlan(method, query, input);
  if (area.data === "water" && query.get("action") === "zones-overview") return waterOverviewPlan(method, query);
  if (area.data === "job-types") return jobTypesPlan(method, query, input);
  if (area.data === "cultivation-cycles") return cultivationPlan(method, query, input);
  if (["seeding", "material-usages", "harvest"].includes(area.data)) return cultivationRecordsPlan(area.data, method, query, input);
  if (["sales-products", "purchase-requests", "workforce", "my-work"].includes(area.data)) return planNewModule(area.data, method, query, input);
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
    const { action, id: recordId, zoneId } = q.data;
    if (key === "water") {
      const path = `/api/zones/${zoneId}/water-measurements`;
      if (action === "list" && zoneId) return make(action, filtered(path, ["from", "to", "status", "page", "pageSize"]), c.waterHistorySchema);
      if (action === "detail" && recordId) return make(action, `/api/water-measurements/${recordId}`, c.waterSchema);
      if (action === "photo" && recordId) return { ...make(action, `/api/water-measurements/${recordId}`, c.waterSchema), file: "photo" };
      if (action === "chart" && zoneId) return make(action, filtered(path + "/chart", ["from", "to"]), c.waterChartSchema);
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
  if (key === "water") {
    if (action === "record" && zoneId) return write(`/api/zones/${zoneId}/water-measurements`, c.recordWaterSchema, c.waterSchema, "Create");
    if (action === "set-thresholds") return write(zoneId ? `/api/zones/${zoneId}/water-thresholds` : "/api/water-thresholds", c.setThresholdsSchema,
      zoneId ? c.zoneThresholdsSchema : z.array(c.zoneThresholdsSchema), "Thresholds", "PUT");
    if (!recordId) return undefined;
    const path = `/api/water-measurements/${recordId}`;
    if (action === "correct") return write(path + "/corrections", c.correctWaterSchema, c.waterSchema, "Edit");
    if (action === "void") return write(path + "/void", c.voidWaterSchema, c.waterSchema, "Edit");
  }
  return undefined;
}
