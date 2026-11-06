import "server-only";
import { z } from "zod";
import { cycle, cycleSummary, cycleValues, zoneCycle } from "@/features/cultivation-api/contracts";
import { raftProgress, laneProgress } from "@/features/cultivation-api/records-contracts";
import { cultivationLog } from "@/features/cultivation-api/logs-contracts";
import type { OperationPlan } from "./operation-plan";
export function cultivationPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  const base = { area: "cultivation-cycles" as const };
  if (new Set(query.keys()).size !== query.size) return;
  if (method === "POST" && !query.size) {
    const remove = z.strictObject({ action: z.literal("log-remove"), id: z.guid(), zoneId: z.guid(), body: z.strictObject({ reason: z.string().trim().min(1).max(1000) }) }).safeParse(input);
    if (remove.success) return { ...base, action: "log-remove", method: "POST", zoneId: remove.data.zoneId, permission: "LogsEdit", path: `/api/cultivation-logs/${remove.data.id}/remove`, body: remove.data.body, schema: z.object({ done: z.literal(true) }), noContent: true };
  }
  if (method === "GET" && ["logs", "log-photo"].includes(query.get("action") ?? "")) {
    const q = z.strictObject({ action: z.enum(["logs", "log-photo"]), id: z.guid(), zoneId: z.guid(), index: z.string().regex(/^[0-9]$/).optional() }).safeParse(Object.fromEntries(query));
    if (!q.success || (q.data.action === "log-photo") !== !!q.data.index) return;
    const { action, id, zoneId, index } = q.data;
    return { ...base, action, zoneId, permission: "LogsView", method: "GET", path: action === "logs" ? `/api/cultivation-cycles/${id}/cultivation-logs` : `/api/cultivation-logs/${id}`, schema: action === "logs" ? z.array(cultivationLog).transform(rows => rows.map(row => ({ ...row, photos: row.photos.map((photo,i) => ({ ...photo, url: `/api/operations/cultivation-cycles?action=log-photo&id=${row.id}&zoneId=${zoneId}&index=${i}` })) }))) : cultivationLog, ...(action === "log-photo" ? { file: "photo" as const, index: Number(index), expectedId: id } : {}) };
  }
  if (method === "GET" && ["progress", "lane-progress"].includes(query.get("action") ?? "")) {
    const q = z.strictObject({ action: z.enum(["progress", "lane-progress"]), id: z.guid(), zoneId: z.guid(), date: z.iso.date().optional(), cycleId: z.guid().optional(), laneNumber: z.string().regex(/^[1-9]\d{0,5}$/).optional() }).safeParse(Object.fromEntries(query));
    if (!q.success) return;
    const { action, id, zoneId, date, cycleId, laneNumber } = q.data;
    if (action === "lane-progress" ? !laneNumber || !!date : !!laneNumber || !!cycleId) return;
    const suffix = new URLSearchParams({ ...(date ? { date } : {}), ...(cycleId ? { cycleId } : {}) });
    return { ...base, action, zoneId, permission: "View", method: "GET", path: `/api/rafts/${id}/${action === "progress" ? "progress" : `lanes/${laneNumber}/progress`}${suffix.size ? `?${suffix}` : ""}`, schema: action === "progress" ? raftProgress : laneProgress };
  }
  if (method === "GET") {
    const q = z.strictObject({ action: z.enum(["list", "history", "detail"]), zoneId: z.guid(), id: z.guid().optional() }).safeParse(Object.fromEntries(query));
    if (!q.success) return;
    const { action, zoneId, id } = q.data;
    if ((action !== "list") !== !!id) return;
    return { ...base, action, zoneId, permission: "View", method: "GET", path: action === "list" ? `/api/zones/${zoneId}/cultivation-cycles` : action === "history" ? `/api/rafts/${id}/cultivation-cycles` : `/api/cultivation-cycles/${id}`, schema: action === "list" ? z.array(zoneCycle) : action === "history" ? z.array(cycleSummary) : cycle, ...(action === "detail" ? { expectedId: id } : {}) };
  }
  if (method !== "POST" || query.size) return;
  const m = z.strictObject({ action: z.enum(["start", "edit", "cancel"]), id: z.guid(), zoneId: z.guid(), body: z.unknown() }).safeParse(input);
  if (!m.success) return;
  const { action, id, zoneId } = m.data;
  const body = (action === "cancel" ? z.strictObject({ rowVersion: z.string().min(1) }) : action === "edit" ? cycleValues.extend({ rowVersion: z.string().min(1) }) : cycleValues).safeParse(m.data.body);
  if (!body.success) return;
  return { ...base, action, zoneId, permission: action === "start" ? "Create" : action === "edit" ? "Edit" : "Delete", method: action === "edit" ? "PUT" : "POST", path: action === "start" ? `/api/rafts/${id}/cultivation-cycles` : `/api/cultivation-cycles/${id}${action === "cancel" ? "/cancel" : ""}`, body: body.data, schema: action === "cancel" ? z.object({ done: z.literal(true) }) : z.object({ cycle }).transform(v => v.cycle), ...(action === "cancel" ? { noContent: true } : action === "edit" ? { expectedId: id } : {}) };
}
