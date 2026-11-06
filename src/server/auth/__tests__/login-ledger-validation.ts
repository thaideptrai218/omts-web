import { z } from "zod";
import { sessionIdHashSchema, sessionRevisionSchema } from "../session-store-validation";

export const ledgerTimestamp = z.number().int().min(0).max(8_640_000_000_000_000);
export const ledgerAttempt = z.strictObject({
  contextHash: sessionIdHashSchema,
  generation: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  attemptId: sessionRevisionSchema,
});
export const beginLedgerInput = z.strictObject({
  contextHash: sessionIdHashSchema, expectedRevision: sessionRevisionSchema, pendingUntilMs: ledgerTimestamp,
});
export const publishLedgerInput = z.strictObject({
  attempt: ledgerAttempt,
  binding: z.strictObject({ sessionHash: sessionIdHashSchema, sessionRevision: sessionRevisionSchema, expiresAtMs: ledgerTimestamp }),
});
export const settleLedgerInput = z.strictObject({ attempt: ledgerAttempt, outcome: z.enum(["rejected", "unknown"]) });
export const invalidateLedgerInput = beginLedgerInput.omit({ pendingUntilMs: true });
export const matchLedgerInput = z.strictObject({
  contextHash: sessionIdHashSchema, sessionHash: sessionIdHashSchema, sessionRevision: sessionRevisionSchema,
});

// Keep exotic/getter test inputs redacted, just like unknown JSON at a boundary.
export function parseLedgerInput<T>(schema: z.ZodType<T>, input: unknown): T | undefined {
  try { const parsed = schema.safeParse(input); return parsed.success ? parsed.data : undefined; }
  catch { return undefined; }
}
