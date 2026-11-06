import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { verificationPurposeSchema } from "@/features/verification-api/contracts";
import { isSessionEncryptionKey, type SessionKeyProvider } from "@/server/auth/session-token-keys";
import type { SessionRedisCommands } from "@/server/auth/session-redis-client";
export const startedSchema = z.object({ verificationId: z.guid(), maskedTarget: z.string().min(1).max(300), expiresAt: z.iso.datetime({ offset: true }), sendsLeft: z.number().int().min(0).max(2), nextResendAt: z.iso.datetime({ offset: true }) });
export const flowPayloadSchema = z.strictObject({ target: z.string().max(254).optional(), channel: z.enum(["Email", "Sms"]).optional(), backendId: z.guid().optional(),
  maskedTarget: z.string().max(300), nextResendAt: z.number().int().nullable(), sendsLeft: z.number().int().min(0).max(2).nullable(), proof: z.string().min(1).max(1024).optional() });
export type FlowPayload = z.infer<typeof flowPayloadSchema>;
const hash = z.string().regex(/^[a-f0-9]{64}$/), timestamp = z.number().int().nonnegative();
const recordSchema = z.strictObject({ id: z.uuid(), revision: z.uuid(), binding: hash, purpose: verificationPurposeSchema, phase: z.enum(["pending", "code", "verified", "unknown", "failed", "done"]),
  expiresAt: timestamp, pendingUntil: timestamp.nullable(), keyId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/), sealed: z.string().regex(/^[A-Za-z0-9_-]+$/).max(16_384) });
export type FlowRecord = z.infer<typeof recordSchema>;
export type OpenFlow = { record: FlowRecord; payload: FlowPayload };
export type FlowBinding = { contextHash: string; binding: string; purpose: z.infer<typeof verificationPurposeSchema> };

export const flowStoreScript = `
local input = cjson.decode(ARGV[1])
local t = redis.call('TIME')
local now = tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
local function result(status, record) return cjson.encode({status=status,record=record}) end
local raw = redis.call('GET',KEYS[1])
local record = raw and cjson.decode(raw) or nil
if input.op == 'start' then
  if record and record.binding == input.binding and record.phase ~= 'done' and record.phase ~= 'failed' then return result('conflict') end
  if input.record.expiresAt <= now or input.record.expiresAt > now+600000 then return result('unavailable') end
  redis.call('SET',KEYS[1],cjson.encode(input.record),'PXAT',input.record.expiresAt)
  return result('found',input.record)
end
if not record or record.binding ~= input.binding then return result('missing') end
if record.expiresAt <= now then return result('missing') end
if record.phase == 'pending' and record.pendingUntil <= now then
  record.phase = 'unknown'
  record.revision = input.revision
  record.pendingUntil = cjson.null
  redis.call('SET',KEYS[1],cjson.encode(record),'PXAT',record.expiresAt,'XX')
end
if input.op == 'read' then return result('found',record) end
if record.id ~= input.id or record.revision ~= input.expectedRevision then return result('conflict') end
if input.op == 'cancel' then
  if record.phase == 'pending' then return result('conflict') end
  redis.call('DEL',KEYS[1]) return result('cancelled')
end
if input.op == 'reserve' then
  local allowed = false
  for _, phase in ipairs(input.allowed) do if phase == record.phase then allowed = true end end
  if not allowed then return result('conflict') end
  record.phase = 'pending' record.pendingUntil = math.min(record.expiresAt,now+60000) record.revision = input.revision
elseif input.op == 'settle' then
  if record.phase ~= 'pending' or input.record.expiresAt <= now or input.record.expiresAt > now+600000 then return result('conflict') end
  record = input.record
else return result('unavailable') end
redis.call('SET',KEYS[1],cjson.encode(record),'PXAT',record.expiresAt,'XX')
return result('found',record)
`;

export function createVerificationFlowStore(commands: SessionRedisCommands, namespace: string, keys: SessionKeyProvider) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(namespace)) throw new Error("Invalid verification namespace");
  const key = (binding: FlowBinding) => `omts:verification:v1:${namespace}:${binding.contextHash}:${binding.purpose}`;
  const aad = (binding: FlowBinding, id: string, keyId: string) => Buffer.from(JSON.stringify(["omts-verification-proof", 1, namespace, binding.contextHash, binding.binding, binding.purpose, id, keyId]));
  async function seal(binding: FlowBinding, record: Omit<FlowRecord, "keyId" | "sealed">, payload: FlowPayload): Promise<FlowRecord> {
    const value = flowPayloadSchema.parse(payload), active = await keys.active();
    if (!isSessionEncryptionKey(active.key)) throw new Error("Verification store unavailable");
    const plaintext = Buffer.from(JSON.stringify(value));
    try {
      const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", active.key, iv); cipher.setAAD(aad(binding, record.id, active.keyId));
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      return recordSchema.parse({ ...record, keyId: active.keyId, sealed: Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url") });
    } finally { plaintext.fill(0); }
  }
  async function run(binding: FlowBinding, input: Record<string, unknown>): Promise<{ status: "found"; flow: OpenFlow } | { status: "missing" | "conflict" | "cancelled" | "unavailable" }> {
    if (!hash.safeParse(binding.contextHash).success || !hash.safeParse(binding.binding).success || !verificationPurposeSchema.safeParse(binding.purpose).success) return { status: "unavailable" };
    try {
      const raw = await commands.eval(flowStoreScript, { keys: [key(binding)], arguments: [JSON.stringify({ ...input, binding: binding.binding, revision: randomUUID() })] });
      if (typeof raw !== "string" || raw.length > 24_000) return { status: "unavailable" };
      const response = z.object({ status: z.enum(["found", "missing", "conflict", "cancelled", "unavailable"]), record: recordSchema.optional() }).parse(JSON.parse(raw));
      if (response.status !== "found") return { status: response.status };
      const record = response.record;
      if (!record || record.binding !== binding.binding || record.purpose !== binding.purpose) return { status: "unavailable" };
      const secret = await keys.byId(record.keyId), bytes = Buffer.from(record.sealed, "base64url");
      if (!isSessionEncryptionKey(secret) || bytes.length <= 28 || bytes.toString("base64url") !== record.sealed) return { status: "unavailable" };
      const cipher = createDecipheriv("aes-256-gcm", secret, bytes.subarray(0, 12)); cipher.setAuthTag(bytes.subarray(12, 28)); cipher.setAAD(aad(binding, record.id, record.keyId));
      const plain = Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]);
      try { return { status: "found", flow: { record, payload: flowPayloadSchema.parse(JSON.parse(plain.toString("utf8"))) } }; } finally { plain.fill(0); }
    } catch { return { status: "unavailable" }; }
  }
  return {
    key,
    read: (binding: FlowBinding) => run(binding, { op: "read" }),
    async start(binding: FlowBinding, payload: FlowPayload) {
      try { const record = await seal(binding, { id: randomUUID(), revision: randomUUID(), purpose: binding.purpose, binding: binding.binding, phase: "pending", expiresAt: Date.now() + 300_000, pendingUntil: Date.now() + 60_000 }, payload); return run(binding, { op: "start", record }); } catch { return { status: "unavailable" as const }; }
    },
    reserve: (binding: FlowBinding, flow: OpenFlow, allowed: FlowRecord["phase"][]) => run(binding, { op: "reserve", id: flow.record.id, expectedRevision: flow.record.revision, allowed }),
    cancel: (binding: FlowBinding, flow: OpenFlow) => run(binding, { op: "cancel", id: flow.record.id, expectedRevision: flow.record.revision }),
    async settle(binding: FlowBinding, flow: OpenFlow, phase: FlowRecord["phase"], payload: FlowPayload, expiresAt = flow.record.expiresAt) {
      try { const record = await seal(binding, { ...flow.record, revision: randomUUID(), phase, pendingUntil: null, expiresAt }, payload); return run(binding, { op: "settle", id: flow.record.id, expectedRevision: flow.record.revision, record }); } catch { return { status: "unavailable" as const }; }
    },
  };
}
export type VerificationFlowStore = ReturnType<typeof createVerificationFlowStore>;
