import "server-only";
import { z } from "zod";
import { jobType, jobsPage, rateValues, addJob } from "@/features/labor-api/contracts";
import type { OperationPlan } from "./operation-plan";
export function jobTypesPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if (new Set(query.keys()).size !== query.size) return;
  const base = { area: "job-types" as const };
  if (method === "GET") {
    const q = z.strictObject({ action: z.enum(["list", "detail"]), id: z.guid().optional(), search: z.string().optional(), statusId: z.enum(["101", "102"]).optional(), page: z.string().regex(/^[1-9]\d{0,6}$/).optional(), pageSize: z.enum(["10", "20", "50", "100"]).optional(), sortBy: z.enum(["name", "rate", "effectiveFrom", "status"]).optional(), sortDir: z.enum(["asc", "desc"]).optional() }).safeParse(Object.fromEntries(query));
    if (!q.success || (q.data.action === "detail") !== !!q.data.id) return;
    if (q.data.action === "detail" && ["search", "statusId", "page", "pageSize", "sortBy", "sortDir"].some(v => query.has(v))) return;
    const search = new URLSearchParams();
    for (const k of ["search", "statusId", "page", "pageSize", "sortBy", "sortDir"]) if (query.has(k)) search.set(k, query.get(k)!);
    return { ...base, action: q.data.action, method: "GET", permission: "View", path: q.data.id ? `/api/job-types/${q.data.id}` : `/api/job-types?${search}`, schema: q.data.id ? jobType : jobsPage, expectedId: q.data.id };
  }
  if (method !== "POST" || query.size) return;
  const m = z.strictObject({ action: z.enum(["create", "rename", "rate", "discontinue", "resume"]), id: z.guid().optional(), zoneId: z.undefined().optional(), body: z.unknown() }).safeParse(input);
  if (!m.success || (m.data.action !== "create") !== !!m.data.id) return;
  const { action, id, body } = m.data;
  const version = { rowVersion: z.string().min(1) };
  const parsed = (action === "create" ? addJob : action === "rate" ? rateValues.extend(version) : action === "rename" ? z.strictObject({ name: z.string().trim().min(1).max(100), ...version }) : z.strictObject(version)).safeParse(body);
  if (!parsed.success) return;
  return { ...base, action, method: action === "rename" ? "PUT" : "POST", permission: action === "create" ? "Create" : "Edit", path: id ? `/api/job-types/${id}/${action === "rate" ? "rates" : action === "rename" ? "name" : action}` : "/api/job-types", body: parsed.data, schema: z.object({ jobType }).transform(v => v.jobType), expectedId: id };
}
