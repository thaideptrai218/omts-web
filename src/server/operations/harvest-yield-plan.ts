import "server-only";
import { z } from "zod";
import { harvestYieldReport } from "@/features/harvest-yield/contracts";
import type { OperationPlan } from "./operation-plan";

const maxZones = 50;
// zoneIds đến từ trình duyệt dạng "a,b,c"; mỗi phần tử phải là GUID, không trùng, tối đa 50.
const zoneIds = z.string().max(maxZones * 37).transform((value) => value.split(",")).pipe(z.array(z.guid()).min(1).max(maxZones)).transform((list) => [...new Set(list)]);
const readQuery = z.strictObject({
  action: z.enum(["list", "export"]), from: z.iso.date().optional(), to: z.iso.date().optional(),
  groupBy: z.enum(["raft", "zone", "cycle"]).optional(), zoneIds: zoneIds.optional(),
});

/** Kế hoạch gọi backend cho Sản lượng nuôi (HARVEST-04): đọc báo cáo (View) và xuất Excel (Export); không có thao tác ghi. */
export function harvestYieldPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if (method !== "GET" || input !== undefined || [...query.keys()].length !== new Set(query.keys()).size) return;
  const parsed = readQuery.safeParse(Object.fromEntries(query));
  if (!parsed.success) return;
  const { action, from, to, groupBy, zoneIds: zones } = parsed.data;
  if (from && to && from > to) return;
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (groupBy) params.set("groupBy", groupBy);
  for (const zone of zones ?? []) params.append("zoneIds", zone);
  const suffix = params.size ? `?${params}` : "";
  const base = { area: "harvest-yield" as const, action, method: "GET" as const };
  if (action === "export") return { ...base, path: `/api/harvest-yield/export${suffix}`, permission: "Export", schema: z.strictObject({}), file: "export" };
  return { ...base, path: `/api/harvest-yield${suffix}`, permission: "View", schema: harvestYieldReport };
}
