import "server-only";
import { z } from "zod";
import { cycleLaborCost, laborCostByRaft, raftCycleCosts } from "@/features/labor-costs/labor-costs-contracts";
import type { OperationPlan } from "./operation-plan";

const range = { from: z.iso.date(), to: z.iso.date(), zoneId: z.guid().optional() };
const readQuery = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("rafts"), ...range }),
  z.strictObject({ action: z.literal("export"), ...range, format: z.enum(["pdf", "xlsx"]).optional() }),
  z.strictObject({ action: z.literal("cycle"), id: z.guid() }),
  z.strictObject({ action: z.literal("raft-cycles"), id: z.guid() }),
]);

/**
 * Backend plan for "Chi phí nhân công" (area `labor-costs`): the cost of each raft in a period, of the cycles of one raft and of one cultivation cycle, and the cost as a PDF or Excel file.
 * Read only (PAYROLL View, and Export for the file: Owner and Accountant). The period is at most one year, as the backend requires.
 */
export function laborCostsPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if (method !== "GET" || input !== undefined || new Set(query.keys()).size !== query.size) return;
  const parsed = readQuery.safeParse(Object.fromEntries(query));
  if (!parsed.success) return;
  const base = { area: "labor-costs" as const, method: "GET" as const, permission: "View" };
  if (parsed.data.action === "cycle") return { ...base, action: "cycle", path: `/api/labor-costs/cycles/${parsed.data.id}`, schema: cycleLaborCost };
  if (parsed.data.action === "raft-cycles") return { ...base, action: "raft-cycles", path: `/api/labor-costs/rafts/${parsed.data.id}/cycles`, schema: raftCycleCosts };
  const { from, to, zoneId } = parsed.data;
  // Inclusive period of at most 366 days, back to front is refused here and again by the backend.
  if (from > to || (Date.parse(to) - Date.parse(from)) / 86_400_000 > 365) return;
  const params = new URLSearchParams({ from, to });
  if (zoneId) params.set("zoneId", zoneId);
  if (parsed.data.action === "export") {
    const format = parsed.data.format;
    if (format) params.set("format", format);
    return { ...base, action: "export", permission: "Export", path: `/api/labor-costs/export?${params}`, schema: z.strictObject({}), file: "export", ...(format === "pdf" ? { exportFormat: "pdf" as const } : {}) };
  }
  return { ...base, action: "rafts", path: `/api/labor-costs/rafts?${params}`, schema: laborCostByRaft };
}