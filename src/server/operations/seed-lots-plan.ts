import "server-only";
import { z } from "zod";
import * as c from "@/features/seed-lots/contracts";
import type { OperationPlan } from "./operation-plan";
import { idList } from "./sales-report-plan";

const area = "seed-lots" as const, id = z.guid();
/**
 * The filters of the Lô giống list, as the API takes them: the receipt date range, supplier, seed item, zone, state, a text matched on the receipt code,
 * the seed lot code and the item, and the sort. Everything else is refused, so the browser cannot reach another query of the API through this door.
 */
const filters = {
  from: z.iso.date().optional(), to: z.iso.date().optional(), supplierId: id.optional(), itemId: id.optional(), zoneId: id.optional(), // One state or several separated by commas.
  state: z.string().max(120).refine((value) => value.split(",").every((part) => (c.seedLotStates as readonly string[]).includes(part)) && new Set(value.split(",")).size === value.split(",").length).optional(),
  search: z.string().trim().min(1).max(100).optional(), sort: z.enum(c.seedLotSorts).optional(), sortDir: z.enum(["asc", "desc"]).optional(),
};
const filterNames = Object.keys(filters) as (keyof typeof filters)[];
const readQuery = z.strictObject({
  action: z.enum(["list", "export", "detail"]), id: id.optional(), ...filters, zoneIds: idList.optional(), // several zones of the header, comma separated
  page: z.string().regex(/^[1-9]\d{0,6}$/).optional(), pageSize: z.enum(["10", "15", "30", "50", "100"]).optional(),
});

/**
 * BFF plan for the Lô giống screen: the list with its totals, the file of the list and the detail of one seed lot (`id` is the id of the receipt line).
 * Read only: a seed lot changes through the receipt, the nursery batch, the seeding and the return, never by itself.
 * Permission: View = the list and the detail; Export = the file (the receipts' Export).
 */
export function seedLotsPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if (method !== "GET" || input !== undefined || new Set(query.keys()).size !== query.size) return;
  const parsed = readQuery.safeParse(Object.fromEntries(query));
  if (!parsed.success) return;
  const q = parsed.data, base = { area, action: q.action, method: "GET" as const };
  const only = (names: readonly string[]) => [...query.keys()].every((name) => name === "action" || names.includes(name));
  if (q.action === "detail") return q.id && only(["id"]) ? { ...base, path: `/api/seed-lots/${q.id}`, permission: "View", schema: c.seedLotDetail, expectedId: q.id } : undefined;
  if (q.id || q.from && q.to && q.from > q.to || !only([...filterNames, "zoneIds", ...(q.action === "list" ? ["page", "pageSize"] : [])])) return;
  if (q.zoneId && q.zoneIds) return;
  const params = new URLSearchParams();
  for (const name of filterNames) if (q[name] !== undefined) params.set(name, q[name]);
  // The backend intersects the zones with those the caller may read, so no single zone is checked here (zoneId stays undefined: any-zone check).
  for (const zone of q.zoneIds ?? []) params.append("zoneIds", zone);
  if (q.action === "list") { params.set("page", q.page ?? "1"); params.set("pageSize", q.pageSize ?? "10"); }
  const path = `/api/seed-lots${q.action === "export" ? "/export" : ""}${params.size ? `?${params}` : ""}`;
  return q.action === "export" ? { ...base, path, zoneId: q.zoneId, permission: "Export", schema: z.strictObject({}), file: "export" } : { ...base, path, zoneId: q.zoneId, permission: "View", schema: c.seedLotPage };
}
