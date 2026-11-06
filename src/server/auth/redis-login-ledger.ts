import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { LoginAttempt, LoginLedger, LoginLedgerContext, LoginSessionBinding } from "./login-ledger";
import type { SessionRedisCommands } from "./session-redis-client";
import { sessionIdHashSchema, sessionRevisionSchema } from "./session-store-validation";

const timestamp = z.number().int().nonnegative().max(8_640_000_000_000_000);
const binding = z.strictObject({ sessionHash: sessionIdHashSchema, sessionRevision: sessionRevisionSchema, expiresAtMs: timestamp });
const attempt = z.strictObject({ contextHash: sessionIdHashSchema, generation: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), attemptId: sessionRevisionSchema });
const state = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("idle") }), z.strictObject({ kind: z.literal("check-required") }),
  z.strictObject({ kind: z.literal("revoked") }),
  z.strictObject({ kind: z.literal("pending"), attemptId: sessionRevisionSchema, pendingUntilMs: timestamp }),
  z.strictObject({ kind: z.literal("active"), binding }),
]);
const context = z.strictObject({ contextHash: sessionIdHashSchema, revision: sessionRevisionSchema,
  generation: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), createdAtMs: timestamp, expiresAtMs: timestamp, state });

// Every operation touches one key atomically. Redis TIME controls deadlines;
// caller time cannot extend an expired lease. No command recreates a missing key.
export const loginLedgerScript = `
local input = cjson.decode(ARGV[1])
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
local function result(status, ctx)
  return cjson.encode({status=status, context=ctx})
end
local function save(ctx)
  if ctx.generation >= 9007199254740991 then return result('unavailable') end
  ctx.revision = input.newRevision
  ctx.generation = ctx.generation + 1
  redis.call('SET', KEYS[1], cjson.encode(ctx), 'PXAT', ctx.expiresAtMs, 'XX')
  return result('updated', ctx)
end
local raw = redis.call('GET', KEYS[1])
if input.op == 'create' then
  if raw then return result('conflict') end
  if input.expiresAtMs <= now then return result('invalid-input') end
  local ctx = {contextHash=input.contextHash, revision=input.newRevision, generation=0,
    createdAtMs=now, expiresAtMs=input.expiresAtMs, state={kind='idle'}}
  redis.call('SET', KEYS[1], cjson.encode(ctx), 'PXAT', ctx.expiresAtMs, 'NX')
  return result('created', ctx)
end
if not raw then return result('missing') end
local ctx = cjson.decode(raw)
if ctx.contextHash ~= input.contextHash then return result('unavailable') end
if ctx.expiresAtMs <= now then return result('expired') end
local deadline = nil
if ctx.state.kind == 'pending' then deadline = ctx.state.pendingUntilMs end
if ctx.state.kind == 'active' then deadline = ctx.state.binding.expiresAtMs end
if deadline and deadline <= now then
  if ctx.generation >= 9007199254740991 then return result('unavailable') end
  ctx.state = {kind='check-required'}
  local changed = save(ctx)
  if input.op == 'read' then return result('found', ctx) end
  return result('conflict')
end
if input.op == 'read' then return result('found', ctx) end
if input.op == 'match' then
  if ctx.state.kind == 'active' and ctx.state.binding.sessionHash == input.binding.sessionHash
    and ctx.state.binding.sessionRevision == input.binding.sessionRevision then return result('matched') end
  return result('not-matched')
end
if input.op == 'begin' or input.op == 'renew' then
  if ctx.revision ~= input.expectedRevision then return result('conflict') end
  if input.op == 'begin' and ctx.state.kind ~= 'idle' then return result('blocked') end
  if input.op == 'renew' and (ctx.state.kind ~= 'active'
    or ctx.state.binding.sessionHash ~= input.binding.sessionHash
    or ctx.state.binding.sessionRevision ~= input.binding.sessionRevision) then return result('blocked') end
  if input.pendingUntilMs <= now or input.pendingUntilMs > ctx.expiresAtMs then return result('invalid-input') end
  ctx.state = {kind='pending', attemptId=input.attemptId, pendingUntilMs=input.pendingUntilMs}
  return save(ctx)
end
if input.op == 'invalidate' then
  if ctx.revision ~= input.expectedRevision then return result('conflict') end
  if ctx.state.kind == 'revoked' then return result('blocked') end
  ctx.state = {kind='revoked'}
  return save(ctx)
end
if ctx.state.kind ~= 'pending' or ctx.generation ~= input.attempt.generation
  or ctx.state.attemptId ~= input.attempt.attemptId then return result('conflict') end
if input.op == 'publish' then
  if input.binding.expiresAtMs <= now then return result('invalid-input') end
  ctx.state = {kind='active', binding=input.binding}
  ctx.expiresAtMs = math.max(ctx.expiresAtMs, input.binding.expiresAtMs)
elseif input.op == 'settle' then
  ctx.state = {kind=input.outcome == 'rejected' and 'idle' or 'check-required'}
else return result('invalid-input') end
return save(ctx)
`;

type Failure = Readonly<{ status: "missing" | "expired" | "invalid-input" | "unavailable" | "conflict" | "blocked" }>;
type CommandResult = Failure | { [Status in "found" | "created" | "updated"]: Readonly<{ status: Status; context: LoginLedgerContext }> }["found" | "created" | "updated"]
  | Readonly<{ status: "matched" | "not-matched" }>;

export type RuntimeLoginLedger = LoginLedger & Readonly<{
  create(contextHash: string, expiresAtMs: number): Promise<CommandResult>;
  reserveActive(input: { contextHash: string; expectedRevision: string; pendingUntilMs: number; binding: LoginSessionBinding }): ReturnType<LoginLedger["begin"]>;
}>;

export function createRedisLoginLedger(commands: SessionRedisCommands, namespace: string): RuntimeLoginLedger {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(namespace)) throw new Error("Invalid login ledger namespace");
  async function run(contextHash: string, input: Record<string, unknown>): Promise<CommandResult> {
    if (!sessionIdHashSchema.safeParse(contextHash).success) return { status: "invalid-input" };
    try {
      const raw = await commands.eval(loginLedgerScript, { keys: [`omts:auth-context:v1:${namespace}:${contextHash}`],
        arguments: [JSON.stringify({ ...input, contextHash, newRevision: randomUUID() })] });
      if (typeof raw !== "string" || raw.length > 8192) return { status: "unavailable" };
      const parsed: unknown = JSON.parse(raw);
      const envelope = z.object({ status: z.enum(["found", "created", "updated", "matched", "not-matched", "missing", "expired", "invalid-input", "unavailable", "conflict", "blocked"]), context: context.optional() }).safeParse(parsed);
      if (!envelope.success) return { status: "unavailable" };
      const value = envelope.data;
      if (value.status === "found" || value.status === "created" || value.status === "updated") {
        if (!value.context || value.context.contextHash !== contextHash) return { status: "unavailable" };
        return { status: value.status, context: value.context };
      }
      return { status: value.status };
    } catch { return { status: "unavailable" }; }
  }
  const checked = <T,>(schema: z.ZodType<T>, input: unknown): T | undefined => {
    try { const parsed = schema.safeParse(input); return parsed.success ? parsed.data : undefined; } catch { return undefined; }
  };
  return {
    async create(contextHash, expiresAtMs) {
      if (!timestamp.safeParse(expiresAtMs).success) return { status: "invalid-input" };
      return run(contextHash, { op: "create", expiresAtMs });
    },
    async read(contextHash) {
      const result = await run(contextHash, { op: "read" });
      return result.status === "found" ? result : { status: result.status === "missing" || result.status === "expired" || result.status === "invalid-input" ? result.status : "unavailable" };
    },
    async begin(input) {
      const value = checked(z.strictObject({ contextHash: sessionIdHashSchema, expectedRevision: sessionRevisionSchema, pendingUntilMs: timestamp }), input);
      if (!value) return { status: "invalid-input" };
      const attemptId = randomUUID();
      const result = await run(value.contextHash, { op: "begin", ...value, attemptId });
      if (result.status === "updated") return { status: "started", context: result.context,
        attempt: { contextHash: value.contextHash, generation: result.context.generation, attemptId } };
      return { status: result.status === "created" || result.status === "found" || result.status === "matched" || result.status === "not-matched" ? "unavailable" : result.status };
    },
    async reserveActive(input) {
      const value = checked(z.strictObject({ contextHash: sessionIdHashSchema, expectedRevision: sessionRevisionSchema, pendingUntilMs: timestamp, binding }), input);
      if (!value) return { status: "invalid-input" };
      const attemptId = randomUUID();
      const result = await run(value.contextHash, { op: "renew", ...value, attemptId });
      return result.status === "updated" ? { status: "started", context: result.context,
        attempt: { contextHash: value.contextHash, generation: result.context.generation, attemptId } }
        : { status: result.status === "created" || result.status === "found" || result.status === "matched" || result.status === "not-matched" ? "unavailable" : result.status };
    },
    async publish(input) {
      const value = checked(z.strictObject({ attempt, binding }), input);
      return write(value?.attempt.contextHash, value ? { op: "publish", ...value } : undefined);
    },
    async settle(input) {
      const value = checked(z.strictObject({ attempt, outcome: z.enum(["rejected", "unknown"]) }), input);
      return write(value?.attempt.contextHash, value ? { op: "settle", ...value } : undefined);
    },
    async invalidate(input) {
      const value = checked(z.strictObject({ contextHash: sessionIdHashSchema, expectedRevision: sessionRevisionSchema }), input);
      return write(value?.contextHash, value ? { op: "invalidate", ...value } : undefined);
    },
    async matchBinding(input) {
      const value = checked(z.strictObject({ contextHash: sessionIdHashSchema, sessionHash: sessionIdHashSchema, sessionRevision: sessionRevisionSchema }), input);
      if (!value) return { status: "invalid-input" };
      const result = await run(value.contextHash, { op: "match", binding: value });
      return { status: result.status === "matched" || result.status === "not-matched" || result.status === "missing" || result.status === "expired" || result.status === "invalid-input" ? result.status : "unavailable" };
    },
  };
  async function write(hash: string | undefined, input: Record<string, unknown> | undefined) {
    if (!hash || !input) return { status: "invalid-input" as const };
    const result = await run(hash, input);
    return result.status === "updated" ? result : { status: result.status === "created" || result.status === "found" || result.status === "matched" || result.status === "not-matched" ? "unavailable" as const : result.status };
  }
}

export function loginBinding(session: { readIdHashForSessionStore(): string; revision: string; expiresAtMs: number }): LoginSessionBinding {
  return { sessionHash: session.readIdHashForSessionStore(), sessionRevision: session.revision, expiresAtMs: session.expiresAtMs };
}

export type { LoginAttempt };
