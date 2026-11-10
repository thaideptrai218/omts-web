import "server-only";
import { z } from "zod";
import * as t from "@/features/lot-tracing/contracts";
import * as w from "@/features/lot-tracing/withdraw-contracts";
import * as k from "@/features/lot-tracing/correction-contracts";
import type { OperationPlan } from "./operation-plan";

const area = "lot-tracing" as const, id = z.guid(), code = z.string().trim().max(100);
const readQuery = z.strictObject({
  action: z.enum(["search", "trace", "export", "publish-check", "cycles", "records", "log-preview", "lot-photos", "seed-lots", "withdraw-preview", "withdrawal-notices"]),
  id: id.optional(), lotCode: code.optional(), invoiceCode: code.optional(),
});
const writeInput = z.strictObject({
  action: z.enum(["publish", "withdraw", "seeding-preview", "seeding-correct", "lot-preview"]), id, zoneId: z.undefined().optional(), body: z.unknown().default({}),
});

/**
 * Kế hoạch gọi backend cho Truy xuất lô hàng (TRACE-02) và Sửa dữ liệu truy xuất (TRACE-03), phần JSON.
 * Quyền (plan.permission): View = LOT_TRACING View, Export = LOT_TRACING Export, Publish = PROVENANCE Publish, Correct = PROVENANCE Edit.
 * Thu hồi nguồn gốc (TRACE-04) dùng quyền Publish: xem trước, thu hồi và đọc lại thông báo. Backend chỉ cho Chủ hợp tác xã (403 với người khác).
 * Sửa nhật ký và sửa lô thu hoạch là multipart, đi qua lotTracingUploadPlan (lot-tracing-upload-plan.ts).
 */
export function lotTracingPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if ([...query.keys()].length !== new Set(query.keys()).size) return;
  if (method === "GET") {
    const parsed = readQuery.safeParse(Object.fromEntries(query));
    if (!parsed.success) return;
    const { action, id: recordId, lotCode, invoiceCode } = parsed.data;
    const base = { area, action, method: "GET" as const };
    if (action === "search") {
      const filter = new URLSearchParams();
      if (lotCode) filter.set("lotCode", lotCode);
      if (invoiceCode) filter.set("invoiceCode", invoiceCode);
      return recordId || !filter.size ? undefined : { ...base, path: `/api/harvest-lots/trace-search?${filter}`, permission: "View", schema: t.searchResult };
    }
    if (!recordId || lotCode !== undefined || invoiceCode !== undefined) return;
    const lot = `/api/harvest-lots/${recordId}`;
    switch (action) {
      case "trace": return { ...base, path: `${lot}/trace`, permission: "View", schema: t.lotTrace };
      case "export": return { ...base, path: `${lot}/trace/export`, permission: "Export", schema: z.unknown(), file: "export" };
      case "withdraw-preview": return { ...base, path: `${lot}/withdraw-preview`, permission: "Publish", schema: w.withdrawPreview };
      case "withdrawal-notices": return { ...base, path: `${lot}/withdrawal-notices`, permission: "Publish", schema: w.withdrawalNotices };
      case "publish-check": return { ...base, path: `${lot}/publish-check`, permission: "Publish", schema: t.publishCheck };
      case "cycles": return { ...base, path: `/api/rafts/${recordId}/trace-corrections`, permission: "Correct", schema: k.correctionCycles };
      case "records": return { ...base, path: `/api/cultivation-cycles/${recordId}/trace-corrections`, permission: "Correct", schema: k.correctionRecords };
      case "log-preview": return { ...base, path: `/api/cultivation-logs/${recordId}/trace-correction/preview`, permission: "Correct", schema: k.preview };
      case "lot-photos": return { ...base, path: lot, permission: "Correct", schema: k.lotPhotoKeys };
      case "seed-lots": return { ...base, path: `/api/rafts/${recordId}/seed-lots`, permission: "Correct", schema: k.seedLotOptions };
    }
    return;
  }
  const parsed = writeInput.safeParse(input);
  if (method !== "POST" || query.size || !parsed.success) return;
  const { action, id: recordId, body } = parsed.data;
  const base = { area, action, permission: "Correct" };
  if (action === "publish") {
    return z.strictObject({}).safeParse(body).success ? { ...base, permission: "Publish", method: "POST", path: `/api/harvest-lots/${recordId}/publish`, schema: t.published } : undefined;
  }
  if (action === "withdraw") {
    const values = w.withdrawBody.safeParse(body);
    return values.success ? { ...base, permission: "Publish", method: "POST", path: `/api/harvest-lots/${recordId}/withdraw`, schema: w.withdrawn, body: values.data } : undefined;
  }
  if (action === "seeding-preview" || action === "lot-preview") {
    const values = (action === "seeding-preview" ? k.seedingPreviewBody : k.lotPreviewBody).safeParse(body);
    const path = action === "seeding-preview" ? `/api/seeding-records/${recordId}/trace-correction/preview` : `/api/harvest-lots/${recordId}/trace-correction/preview`;
    return values.success ? { ...base, method: "POST", path, schema: k.preview, body: values.data } : undefined;
  }
  const values = k.seedingSaveBody.safeParse(body);
  return values.success ? { ...base, method: "PUT", path: `/api/seeding-records/${recordId}/trace-correction`, schema: k.corrected, body: values.data } : undefined;
}
