import "server-only";
import { z } from "zod";
import { newSessionSchema, sessionIdHashSchema, sessionRevisionSchema } from "@/server/auth/session-store-validation";

const timestamp = z.number().int().min(0).max(8_640_000_000_000_000);
const storedSessionSchema = newSessionSchema.extend({
  schemaVersion: z.literal(1), createdAtMs: timestamp, revision: sessionRevisionSchema,
}).refine((s) => s.createdAtMs < s.expiresAtMs && s.expiresAtMs <= s.refreshExpiresAtMs);

const activeSchema = z.strictObject({ kind: z.literal("active"), session: storedSessionSchema });
const revokedSchema = z.strictObject({
  kind: z.literal("revoked"), schemaVersion: z.literal(1), idHash: sessionIdHashSchema, expiresAtMs: timestamp,
});
const recordSchema = z.discriminatedUnion("kind", [activeSchema, revokedSchema]);
export type SessionRedisRecord = z.infer<typeof recordSchema>;

export function encodeSessionRecord(record: SessionRedisRecord): string | undefined {
  const parsed = recordSchema.safeParse(record);
  if (!parsed.success) return undefined;
  const raw = JSON.stringify(parsed.data);
  return Buffer.byteLength(raw, "utf8") <= 32_768 ? raw : undefined;
}

// Bound JSON parsing as well as the protected-token field. Never accept partial records.
export function decodeSessionRecord(raw: unknown, idHash: string): SessionRedisRecord | undefined {
  if (typeof raw !== "string" || Buffer.byteLength(raw, "utf8") > 32_768) return undefined;
  try {
    const parsed = recordSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return undefined;
    const embeddedHash = parsed.data.kind === "active" ? parsed.data.session.idHash : parsed.data.idHash;
    return embeddedHash === idHash ? parsed.data : undefined;
  } catch { return undefined; }
}
