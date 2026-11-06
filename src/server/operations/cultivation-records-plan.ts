import "server-only";
import { z } from "zod";
import * as c from "@/features/cultivation-api/records-contracts";
import { cycle } from "@/features/cultivation-api/contracts";
import type { OperationArea } from "@/features/operations/permissions";
import type { OperationPlan } from "./operation-plan";
export function cultivationRecordsPlan(area: OperationArea, method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if (new Set(query.keys()).size !== query.size) return;
  const seeding = area === "seeding", material = area === "material-usages";
  if (area === "harvest" && method === "GET" && query.get("action") === "photo") {
    const q = z.strictObject({ action: z.literal("photo"), id: z.guid(), zoneId: z.guid(), index: z.string().regex(/^[0-9]$/) }).safeParse(Object.fromEntries(query));
    if (!q.success) return;
    return { area, action: "photo", method: "GET", zoneId: q.data.zoneId, permission: "View", path: `/api/harvest-lots/${q.data.id}`, schema: c.harvestDetail, expectedId: q.data.id, file: "photo", index: Number(q.data.index) };
  }
  if (area === "harvest" && method === "GET" && query.get("action") === "detail") {
    const q = z.strictObject({ action: z.literal("detail"), id: z.guid(), zoneId: z.guid() }).safeParse(Object.fromEntries(query));
    if (!q.success) return;
    return { area, action: "detail", method: "GET", zoneId: q.data.zoneId, permission: "View", path: `/api/harvest-lots/${q.data.id}`, schema: c.harvestDetail, expectedId: q.data.id };
  }
  if (area === "harvest" && method === "GET" && ["settings", "settings-preview"].includes(query.get("action") ?? "")) {
    const q = z.strictObject({ action: z.enum(["settings", "settings-preview"]), days: z.string().regex(/^\d{1,3}$/).refine(v => Number(v) >= 1 && Number(v) <= 365).optional() }).safeParse(Object.fromEntries(query));
    if (!q.success || (q.data.action === "settings-preview") !== !!q.data.days) return;
    return { area, action: q.data.action, permission: "Owner", method: "GET", path: q.data.action === "settings" ? "/api/harvest-settings" : `/api/harvest-settings/auto-close-preview?days=${q.data.days}`, schema: q.data.action === "settings" ? c.harvestSettings : c.harvestClosePreview };
  }
  if (area === "harvest" && method === "POST" && !query.size) {
    const settings = z.strictObject({ action: z.literal("settings"), body: c.harvestSettingsValues, id: z.undefined().optional(), zoneId: z.undefined().optional() }).safeParse(input);
    if (settings.success) return { area, action: "settings", permission: "Owner", method: "PUT", path: "/api/harvest-settings", body: settings.data.body, schema: z.object({ settings: c.harvestSettings }).transform(v => v.settings) };
  }
  if (method === "GET") {
    const q = z.strictObject({ action: z.enum(["list", "seed-lots", "preview"]), id: z.guid(), zoneId: z.guid() }).safeParse(Object.fromEntries(query));
    if (!q.success) return;
    const { action, id, zoneId } = q.data;
    if (action !== "list" && !seeding) return;
    return { area, action, zoneId, permission: action === "preview" ? "Create" : "View", method: "GET", path: seeding ? action === "seed-lots" ? `/api/rafts/${id}/seed-lots` : `/api/cultivation-cycles/${id}/${action === "preview" ? "seeding-complete/preview" : "seeding-records"}` : `/api/rafts/${id}/${material ? "material-usages" : "harvest-lots"}`, schema: seeding ? action === "seed-lots" ? c.seedLots : action === "preview" ? c.seedingPreview : c.seedingList : material ? c.materialList : c.harvestList };
  }
  if (method !== "POST" || query.size) return;
  const m = z.strictObject({ action: z.enum(["record", "correct", "remove", "complete"]), id: z.guid(), zoneId: z.guid(), body: z.unknown() }).safeParse(input);
  if (!m.success) return;
  const { action, id, zoneId, body } = m.data;
  const base = { area, action, zoneId, method: "POST" as const, permission: action === "correct" ? "Edit" : action === "remove" ? "Delete" : "Create" };
  const version = { rowVersion: z.string().min(1) }, reason = { reason: z.string().trim().min(1), ...version };
  if (area === "harvest" && action === "remove") {
    const values = z.strictObject(reason).safeParse(body);
    if (!values.success) return;
    return { ...base, path: `/api/harvest-lots/${id}/remove`, body: values.data, schema: z.object({ done: z.literal(true) }), noContent: true };
  }
  if (seeding) {
    const values = (action === "complete" ? z.strictObject(version) : action === "remove" ? z.strictObject(reason) : action === "correct" ? c.seedValues.extend(reason) : c.seedValues).safeParse(body);
    if (!values.success) return;
    return { ...base, body: values.data, method: action === "correct" ? "PUT" : "POST", path: action === "correct" || action === "remove" ? `/api/seeding-records/${id}${action === "remove" ? "/remove" : ""}` : `/api/cultivation-cycles/${id}/${action === "complete" ? "seeding-complete" : "seeding-records"}`, schema: action === "remove" ? z.object({ done: z.literal(true) }) : action === "complete" ? z.object({ cycle }) : z.object({ record: c.seedingRecord }), ...(action === "remove" ? { noContent: true } : {}) };
  }
  if (material && ["record", "correct"].includes(action)) {
    const validator = action === "record" ? c.materialValues : z.strictObject({ raftId: z.guid(), usageDate: z.iso.date(), itemId: z.guid(), quantity: z.number().positive(), repairReason: z.string().trim().min(1), ...reason });
    const values = validator.safeParse(body);
    if (!values.success) return;
    return { ...base, body: values.data, method: action === "correct" ? "PUT" : "POST", path: action === "correct" ? `/api/material-usages/${id}` : `/api/rafts/${id}/material-usages`, schema: action === "record" ? z.object({ records: z.array(c.materialRecord) }) : z.object({ record: c.materialRecord }) };
  }
  if (area === "harvest" && action === "record") {
    const values = c.harvestValues.safeParse(body);
    if (!values.success) return;
    return { ...base, path: `/api/rafts/${id}/harvest-lots`, body: values.data, multipartFields: true, schema: z.object({ lot: z.object({ id: z.guid(), lotCode: z.string() }) }) };
  }
}
