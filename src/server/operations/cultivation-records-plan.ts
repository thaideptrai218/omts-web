import "server-only";
import { z } from "zod";
import * as c from "@/features/cultivation-api/records-contracts";
import { cycle } from "@/features/cultivation-api/contracts";
import { crewSuggestions } from "@/features/cultivation-api/record-crew-contracts";
import { historyList } from "@/features/history/history-contracts";
import { finishHarvestResult, finishHarvestValues, matchesFinishedSelection } from "@/features/cultivation-api/finish-harvest-contracts";
import { cageSheet } from "@/features/harvest-lots/cage-contracts";
import * as lots from "@/features/harvest-lots/contracts";
import type { OperationArea } from "@/features/operations/permissions";
import type { OperationPlan } from "./operation-plan";

/** The filters of the Lô thu hoạch list, as the web names them; the API takes the same names. Dates are yyyy-MM-dd (the harvest date). */
const lotFilters = {
  from: z.iso.date().optional(), to: z.iso.date().optional(), zoneId: z.guid().optional(), raftId: z.guid().optional(), productId: z.guid().optional(),
  statusId: z.enum(["2901", "2902", "2903", "2904"]).optional(), weighed: z.enum(["true", "false"]).optional(), closeReason: z.enum(lots.closeReasons).optional(),
  hasPlan: z.enum(["true", "false"]).optional(), search: z.string().trim().min(1).max(100).optional(), sort: z.enum(["code", "harvestedAt", "remainingKg"]).optional(), desc: z.enum(["true", "false"]).optional(),
};
const lotList = z.strictObject({ action: z.literal("lots"), ...lotFilters, page: z.string().regex(/^[1-9]\d{0,6}$/).optional(), pageSize: z.enum(["10", "15", "30", "50", "100"]).optional() });
const lotExport = z.strictObject({ action: z.literal("export"), ...lotFilters });
/** Weigh (Cân thực tế), reopen with a reason and close by hand: each answers the lot as it is now. */
const lotActions = new Set(["weigh", "reopen", "close"]);
/** Cage weighing: one cage added, corrected or taken off the sheet; each answers the whole sheet. */
const cageActions = new Set(["cage-add", "cage-update", "cage-remove"]);

export function cultivationRecordsPlan(area: OperationArea, method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if (new Set(query.keys()).size !== query.size) return;
  const seeding = area === "seeding", material = area === "material-usages";
  if (seeding && method === "GET" && query.get("action") === "photo") {
    const q = z.strictObject({ action: z.literal("photo"), id: z.guid(), zoneId: z.guid(), index: z.string().regex(/^[0-9]$/) }).safeParse(Object.fromEntries(query));
    if (!q.success) return;
    return { area, action: "photo", method: "GET", zoneId: q.data.zoneId, permission: "View", path: `/api/seeding-records/${q.data.id}`, schema: c.seedingRecord, expectedId: q.data.id, file: "photo", index: Number(q.data.index) };
  }
  if (area === "harvest" && method === "GET" && query.get("action") === "photo") {
    const q = z.strictObject({ action: z.literal("photo"), id: z.guid(), zoneId: z.guid(), index: z.string().regex(/^[0-9]$/) }).safeParse(Object.fromEntries(query));
    if (!q.success) return;
    return { area, action: "photo", method: "GET", zoneId: q.data.zoneId, permission: "View", path: `/api/harvest-lots/${q.data.id}`, schema: c.harvestDetail, expectedId: q.data.id, file: "photo", index: Number(q.data.index) };
  }
  if (method === "GET" && query.get("action") === "history") {
    // Change history of one record (who, when, action, reason, changed fields); the backend route differs per record kind.
    const q = z.strictObject({ action: z.literal("history"), id: z.guid(), zoneId: z.guid() }).safeParse(Object.fromEntries(query));
    if (!q.success) return;
    const root = area === "harvest" ? "harvest-lots" : seeding ? "seeding-records" : material ? "material-usages" : undefined;
    return root && { area, action: "history", method: "GET", zoneId: q.data.zoneId, permission: "View", path: `/api/${root}/${q.data.id}/history`, schema: historyList };
  }
  if (area === "harvest" && method === "GET" && ["lots", "export"].includes(query.get("action") ?? "")) {
    // Every lot the caller may see (Owner: all zones; Zone Manager: their zones), and the file with the same filters and no paging.
    const q = (query.get("action") === "export" ? lotExport : lotList).safeParse(Object.fromEntries(query));
    if (!q.success || q.data.from && q.data.to && q.data.from > q.data.to) return;
    const { action, ...filters } = q.data;
    const params = new URLSearchParams();
    // The backend names the direction sortDir (asc|desc); the screen keeps a desc flag like the other lists.
    for (const [name, value] of Object.entries(filters)) if (value !== undefined) params.set(name === "desc" ? "sortDir" : name, name === "desc" ? (value === "false" ? "asc" : "desc") : String(value));
    const path = `/api/harvest-lots${action === "export" ? "/export" : ""}${params.size ? `?${params}` : ""}`;
    return action === "export"
      ? { area, action, method: "GET", zoneId: q.data.zoneId, permission: "View", path, schema: z.strictObject({}), file: "export" }
      : { area, action, method: "GET", zoneId: q.data.zoneId, permission: "View", path, schema: lots.lotPage };
  }
  if (area === "harvest" && method === "GET" && query.get("action") === "movements") {
    const q = z.strictObject({ action: z.literal("movements"), id: z.guid(), zoneId: z.guid() }).safeParse(Object.fromEntries(query));
    if (!q.success) return;
    return { area, action: "movements", method: "GET", zoneId: q.data.zoneId, permission: "View", path: `/api/harvest-lots/${q.data.id}/movements`, schema: lots.lotMovements };
  }
  if (area === "harvest" && method === "GET" && query.get("action") === "detail") {
    const q = z.strictObject({ action: z.literal("detail"), id: z.guid(), zoneId: z.guid() }).safeParse(Object.fromEntries(query));
    if (!q.success) return;
    return { area, action: "detail", method: "GET", zoneId: q.data.zoneId, permission: "View", path: `/api/harvest-lots/${q.data.id}`, schema: c.harvestDetail, expectedId: q.data.id };
  }
  if (area === "harvest" && method === "GET" && query.get("action") === "cages") {
    const q = z.strictObject({ action: z.literal("cages"), id: z.guid(), zoneId: z.guid() }).safeParse(Object.fromEntries(query));
    if (!q.success) return;
    return { area, action: "cages", method: "GET", zoneId: q.data.zoneId, permission: "View", path: `/api/harvest-lots/${q.data.id}/cages`, schema: cageSheet };
  }
  if (area === "harvest" && method === "GET" && query.get("action") === "crew-suggestions") {
    const q = z.strictObject({ action: z.literal("crew-suggestions"), id: z.guid(), zoneId: z.guid(), date: z.iso.date() }).safeParse(Object.fromEntries(query));
    if (!q.success) return;
    return { area, action: "crew-suggestions", method: "GET", zoneId: q.data.zoneId, permission: "View", path: `/api/rafts/${q.data.id}/crew-suggestions?date=${q.data.date}`, schema: crewSuggestions };
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
  const m = z.strictObject({ action: z.enum(["record", "correct", "remove", "complete", "finish-lane", "finish-harvest", "weigh", "reopen", "close", "cage-add", "cage-update", "cage-remove"]), id: z.guid(), zoneId: z.guid(), body: z.unknown() }).safeParse(input);
  if (!m.success) return;
  const { action, id, zoneId, body } = m.data;
  if ((lotActions.has(action) || cageActions.has(action)) && area !== "harvest") return;
  const base = { area, action, zoneId, method: "POST" as const, permission: action === "correct" || lotActions.has(action) || cageActions.has(action) ? "Edit" : action === "remove" ? "Delete" : "Create" };
  // The Cooperative Owner may complete while employees are not checked out yet (MSG-LABOR-37), with a reason.
  const ownerApproval = { ownerApproved: z.boolean().optional(), approvalReason: z.string().trim().min(1).max(1000).optional() };
  const version = { rowVersion: z.string().min(1) }, reason = { reason: z.string().trim().min(1), ...version };
  if (area === "harvest" && action === "finish-harvest") {
    const values = finishHarvestValues.safeParse(body);
    if (!values.success) return;
    return { ...base, permission: "Create", path: `/api/rafts/${id}/finish-harvest`, body: values.data, schema: finishHarvestResult.refine(result => matchesFinishedSelection(values.data.laneNumbers, result)) };
  }
  if (action === "finish-harvest") return;
  if (area === "harvest" && action === "finish-lane") {
    // One decisive per-lane action (no body): the lane number is validated here and only ever enters the path as digits.
    const lane = z.strictObject({ laneNumber: z.number().int().min(1).max(999_999), ...ownerApproval }).safeParse(body);
    if (!lane.success) return;
    return { ...base, permission: "Create", path: `/api/rafts/${id}/lanes/${lane.data.laneNumber}/finish-harvest`, ...(lane.data.ownerApproved ? { body: { ownerApproved: true, approvalReason: lane.data.approvalReason } } : {}), schema: c.finishLaneResult };
  }
  if (area === "harvest" && cageActions.has(action)) {
    const root = `/api/harvest-lots/${id}/cages`;
    if (action === "cage-add") { const values = lots.cageValues.safeParse(body); return values.success ? { ...base, path: root, body: values.data, schema: cageSheet } : undefined; }
    if (action === "cage-update") {
      const values = lots.cageUpdateValues.safeParse(body);
      if (!values.success) return;
      const { cageId, ...rest } = values.data;
      return { ...base, method: "PUT", path: `${root}/${cageId}`, body: rest, schema: cageSheet };
    }
    const values = lots.cageRemoveValues.safeParse(body);
    return values.success ? { ...base, method: "DELETE", path: `${root}/${values.data.cageId}`, schema: cageSheet } : undefined;
  }
  if (area === "harvest" && lotActions.has(action)) {
    const values = (action === "weigh" ? lots.weighValues : action === "reopen" ? lots.reopenValues : lots.closeValues).safeParse(body);
    if (!values.success) return;
    return { ...base, path: `/api/harvest-lots/${id}/${action}`, body: values.data, schema: c.harvestLotAnswer };
  }
  if (area === "harvest" && action === "remove") {
    const values = z.strictObject(reason).safeParse(body);
    if (!values.success) return;
    return { ...base, path: `/api/harvest-lots/${id}/remove`, body: values.data, schema: z.object({ done: z.literal(true) }), noContent: true };
  }
  if (seeding) {
    const values = (action === "complete" ? z.strictObject({ ...version, confirmEmpty: z.boolean().optional(), ...ownerApproval }) : action === "remove" ? z.strictObject(reason) : action === "correct" ? c.seedValues.safeExtend(reason) : c.seedValues).safeParse(body);
    if (!values.success) return;
    return { ...base, body: values.data, method: action === "correct" ? "PUT" : "POST", path: action === "correct" || action === "remove" ? `/api/seeding-records/${id}${action === "remove" ? "/remove" : ""}` : `/api/cultivation-cycles/${id}/${action === "complete" ? "seeding-complete" : "seeding-records"}`, schema: action === "remove" ? z.object({ done: z.literal(true) }) : action === "complete" ? z.object({ cycle }) : z.object({ record: c.seedingRecord }), ...(action === "remove" ? { noContent: true } : {}) };
  }
  if (material && action === "remove") {
    // Voiding a material usage (reverses its stock issue): reason and version, 204 like the seeding removal.
    const values = z.strictObject(reason).safeParse(body);
    if (!values.success) return;
    return { ...base, path: `/api/material-usages/${id}/remove`, body: values.data, schema: z.object({ done: z.literal(true) }), noContent: true };
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
    return { ...base, path: `/api/rafts/${id}/harvest-lots`, body: values.data, multipartFields: true, schema: c.harvestSaved };
  }
}
