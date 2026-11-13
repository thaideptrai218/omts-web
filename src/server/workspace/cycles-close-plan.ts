import "server-only";
import { z } from "zod";
import { historyList } from "@/features/history/history-contracts";
import { closePreview, closeValues, closedCycle, cycleFigures } from "@/features/cycles-api/close-contracts";

/** Backend calls of the cycle Hành trình / close flow: strict inputs, fixed paths, and the shape each answer must have. */
export type CycleClosePlan = {
  action: "summary" | "close-preview" | "close" | "cycle-history"; method: "GET" | "POST"; path: string; permission: "View" | "Edit";
  cycleId: string; body?: z.infer<typeof closeValues>; schema: z.ZodType; answerCycleId(data: unknown): string;
};
const base = (action: CycleClosePlan["action"], cycleId: string) => `/api/cultivation-cycles/${cycleId}/${{ summary: "summary", close: "close", "close-preview": "close/preview", "cycle-history": "history" }[action]}`;

/** GET ?action=summary|close-preview&cycleId=... (no other key, no repeated key). */
export function planCycleCloseRead(query: URLSearchParams): CycleClosePlan | undefined {
  if (new Set(query.keys()).size !== query.size) return;
  const parsed = z.strictObject({ action: z.enum(["summary", "close-preview", "cycle-history"]), cycleId: z.guid() }).safeParse(Object.fromEntries(query));
  if (!parsed.success) return;
  const { action, cycleId } = parsed.data;
  // The change history answers a plain list: it carries no cycle id, the path already names the cycle.
  if (action === "cycle-history") return { action, method: "GET", path: base(action, cycleId), cycleId, permission: "View", schema: historyList, answerCycleId: () => cycleId };
  return { action, method: "GET", path: base(action, cycleId), cycleId, permission: action === "summary" ? "View" : "Edit",
    schema: action === "summary" ? cycleFigures : closePreview, answerCycleId: data => action === "summary" ? (data as z.infer<typeof cycleFigures>).cycleId : (data as z.infer<typeof closePreview>).summary.cycleId };
}

/** POST { action: "close", id, body: { assessment, rowVersion, ownerApproved? } }. */
export function planCycleClose(input: unknown): CycleClosePlan | undefined {
  const parsed = z.strictObject({ action: z.literal("close"), id: z.guid(), body: closeValues }).safeParse(input);
  if (!parsed.success) return;
  return { action: "close", method: "POST", path: base("close", parsed.data.id), cycleId: parsed.data.id, permission: "Edit", body: parsed.data.body,
    schema: closedCycle, answerCycleId: data => (data as z.infer<typeof closedCycle>).cycle.id };
}
