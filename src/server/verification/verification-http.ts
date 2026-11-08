import "server-only";
import { createHash } from "node:crypto";
import { verificationCommandSchema, type VerificationPurpose } from "@/features/verification-api/contracts";
import { createCsrfGuard } from "@/server/auth/csrf-guard";
import { createAuthContextCookieHelpers } from "@/server/auth/auth-context-cookie";
import { parseServerSessionRuntimeConfig } from "@/server/auth/server-session-runtime-config";
import { connectSessionRedis } from "@/server/auth/session-redis-client";
import { createRedisLoginLedger } from "@/server/auth/redis-login-ledger";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { parseServerBackendConfig } from "@/server/config/backend-config";
import { readBackendResponse } from "@/server/backend/backend-response";
import { createVerificationFlowStore } from "./flow-store";
import { runVerification } from "./flow-service";

type Stores = { store: ReturnType<typeof createVerificationFlowStore>; ledger: ReturnType<typeof createRedisLoginLedger> };
let stores: Stores | undefined, opening: Promise<Stores | undefined> | undefined;
async function getStores() {
  if (stores) return stores;
  opening ??= (async () => {
    const config = parseServerSessionRuntimeConfig(process.env);
    if (config.status !== "valid") return undefined;
    const { url, connectTimeoutMs, commandTimeoutMs } = config.config.redis;
    const connection = await connectSessionRedis({ url, connectTimeoutMs, commandTimeoutMs });
    if (connection.status !== "connected") return undefined;
    stores = { store: createVerificationFlowStore(connection.connection.commands, config.config.redis.namespace, config.config.keys), ledger: createRedisLoginLedger(connection.connection.commands, config.config.redis.namespace) };
    return stores;
  })().finally(() => { opening = undefined; });
  return opening;
}
export async function handleVerification(request: Request) {
  const headers = new Headers({ "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
  const gateway = getSessionGateway();
  if (gateway.mode === "mock") return json({ status: "error" }, 404);
  const csrf = createCsrfGuard(process.env), contexts = createAuthContextCookieHelpers(process.env), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api" || csrf.status !== "available" || contexts.status !== "available" || backend.status !== "valid" || backend.config.source !== "api") return json({ status: "error", uncertain: true }, 503);
  if (new URL(request.url).search) return json({ status: "error", code: "MSG01", uncertain: false }, 400);
  try {
    const checked = await csrf.guard.check(request, { method: "POST", body: "json", maxBytes: 8192, timeoutMs: 5000 });
    if (checked.status !== "allowed") return json({ status: "error", uncertain: false }, checked.status === "rejected" ? checked.httpStatus : 503);
    const command = verificationCommandSchema.safeParse(checked.body.readForValidation());
    if (!command.success) return json({ status: "error", code: "MSG01", uncertain: false }, 400);
    const cookie = contexts.cookies.read(request.headers.get("cookie"));
    if (cookie.status !== "found") return json({ status: "error", uncertain: false }, 409);
    const activeStores = await getStores();
    if (!activeStores) return json({ status: "error", uncertain: true }, 503);
    async function resolve(purpose: VerificationPurpose) {
      const context = await activeStores!.ledger.read(cookie.status === "found" ? cookie.contextHash : "");
      const session = await gateway.resolve(request.headers.get("cookie"));
      if (context.status !== "found" || session.status === "unavailable") return undefined;
      if (purpose === "registration" || purpose === "recovery") {
        if (session.status !== "anonymous" || context.context.state.kind !== "idle") return undefined;
        return { binding: createHash("sha256").update(JSON.stringify([context.context.revision, "anonymous"])).digest("hex"), session: undefined };
      }
      if (session.status !== "resolved" || context.context.state.kind !== "active" || (purpose === "contact" ? session.session.phase !== "application" : !["application", "password-change-required"].includes(session.session.phase))) return undefined;
      return { binding: createHash("sha256").update(JSON.stringify([context.context.revision, session.session.readIdHashForSessionStore(), session.session.revision, session.session.identity.accountId])).digest("hex"), session: session.session };
    }
    const initial = await resolve(command.data.purpose);
    if (!initial) return json({ status: "error", uncertain: false }, 409);
    const config = backend.config, signal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.max(30_000, config.timeoutMs))]);
    const reply = await runVerification(command.data, {
      store: activeStores.store, binding: { contextHash: cookie.contextHash, binding: initial.binding, purpose: command.data.purpose }, signal,
      current: async () => (await resolve(command.data.purpose))?.binding === initial.binding,
      account: initial.session ? { id: initial.session.identity.accountId, subjectType: initial.session.identity.subjectType } : undefined,
      async call(path, body) {
        const response = await fetch(new URL(path, config.origin), { method: body === undefined ? "GET" : "POST", cache: "no-store", credentials: "omit", redirect: "error", signal,
          headers: { Accept: "application/json", ...(initial.session ? { Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
        return readBackendResponse(response, "profileRead");
      },
      rotate: (input, proof) => gateway.changePasswordFromVerification(request.headers.get("cookie"), input, signal, proof),
    });
    if (reply.auth && (reply.auth.status === "created" || reply.auth.status === "active") && reply.auth.cookie) headers.append("Set-Cookie", reply.auth.cookie.readForResponseHeader());
    return json(reply.body, reply.httpStatus);
  } catch { return json({ status: "error", uncertain: true }, 503); }
}
