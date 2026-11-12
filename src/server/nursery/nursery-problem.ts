import "server-only";
import { z } from "zod";
import { readBoundedBytes } from "../operations/bounded-body";

const text = z.string().max(1000).optional().catch(undefined);
const number = z.number().finite().nullish().catch(undefined);
const problemSchema = z.object({ code: text, field: text, fields: z.array(z.string().max(100)).max(20).optional().catch(undefined),
  message: text, hint: text, reasonCode: text, currentRowVersion: text, raftId: text, raftCode: text, cycleId: text,
  onHand: number, balanceAfter: number, allocated: number, seeded: number, remaining: number, quantity: number, previousCloseDate: text });

export async function readNurseryProblem(response: Response, signal: AbortSignal) {
  if (!response.headers.get("content-type")?.includes("json")) return undefined;
  try {
    const bytes = await readBoundedBytes(response.body, signal, 64 * 1024, 5000);
    const parsed = problemSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    return parsed.success ? parsed.data : undefined;
  } catch { return undefined; }
}
