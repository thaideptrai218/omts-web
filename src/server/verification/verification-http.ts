import "server-only";
import { createHash } from "node:crypto";
import { verificationCommandSchema } from "@/features/verification-api/contracts";
import { createCsrfGuard } from "@/server/auth/csrf-guard";
import { createSessionCookieHelpers } from "@/server/auth/session-cookies";
import { parseServerSessionKeyring } from "@/server/auth/session-keyring-config";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { AUTH_REJECTION_BEFORE_EXECUTION, AUTH_REJECTION_HEADER } from "@/shared/http/session-headers";
import { createBffHeaders } from "@/server/backend/backend-transport";
import { parseServerBackendConfig } from "@/server/config/backend-config";
import { readBackendResponse } from "@/server/backend/backend-response";
import { createVerificationFlowStore } from "./flow-store";
import { runVerification } from "./flow-service";

type Store = ReturnType<typeof createVerificationFlowStore>;
let store: Store | undefined;
// Lazy: importing the route during a build never reads the environment.
function getStore(): Store | undefined {
  if (store) return store;
  const keyring = parseServerSessionKeyring(process.env);
  if (keyring.status !== "valid") return undefined;
  store = createVerificationFlowStore(keyring.provider);
  return store;
}
const bindingHash = (parts: readonly string[]) => createHash("sha256").update("omts-bff-flow:v2:").update(JSON.stringify(parts)).digest("hex");
export async function handleVerification(request: Request) {
  const headers = new Headers({ "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
  const gateway = getSessionGateway();
  if (gateway.mode === "mock") return json({ status: "error" }, 404);
  const csrf = createCsrfGuard(process.env), cookies = createSessionCookieHelpers(process.env), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api" || csrf.status !== "available" || cookies.status !== "available" || backend.status !== "valid" || backend.config.source !== "api") return json({ status: "error", uncertain: true }, 503);
  if (new URL(request.url).search) return json({ status: "error", code: "MSG01", uncertain: false }, 400);
  try {
    const checked = await csrf.guard.check(request, { method: "POST", body: "json", maxBytes: 8192, timeoutMs: 5000 });
    if (checked.status !== "allowed") return json({ status: "error", uncertain: false }, checked.status === "rejected" ? checked.httpStatus : 503);
    const command = verificationCommandSchema.safeParse(checked.body.readForValidation());
    if (!command.success) return json({ status: "error", code: "MSG01", uncertain: false }, 400);
    const activeStore = getStore();
    if (!activeStore) return json({ status: "error", uncertain: true }, 503);
    const cookieHeader = request.headers.get("cookie");
    const flowCookie = cookies.cookies.readFlow(cookieHeader);
    if (flowCookie.status === "invalid-cookie") return json({ status: "error", uncertain: false }, 400);
    const anonymousPurpose = command.data.purpose === "recovery";
    const requiredPhase = command.data.purpose === "phone" ? "contact-verification-required" : "application";
    async function resolve(confirmPhase: boolean) {
      const session = await gateway.resolve(cookieHeader);
      if (session.status === "unavailable") return undefined;
      if (anonymousPurpose) {
        if (session.status !== "anonymous") return undefined;
        return { binding: bindingHash(["anonymous"]), session: undefined };
      }
      if (session.status !== "resolved") return undefined;
      if (confirmPhase) {
        // The cookie only says a token exists; the API says whether the session is alive and where it stands.
        const phase = await gateway.phase(cookieHeader);
        // Phone verification is the one flow open while the account still has to verify its phone; every other one needs a fully usable session.
        if (phase.status !== "ready" || phase.phase !== requiredPhase) return undefined;
      }
      return { binding: bindingHash([session.session.identity.backendSessionId, session.session.identity.accountId]), session: session.session };
    }
    const initial = await resolve(true);
    if (!initial) {
      // A signed-in flow without a usable access token was refused before anything ran: the client may renew and retry.
      if (!anonymousPurpose && (await gateway.resolve(cookieHeader)).status === "anonymous") {
        headers.set(AUTH_REJECTION_HEADER, AUTH_REJECTION_BEFORE_EXECUTION);
        return json({ status: "error", uncertain: false }, 401);
      }
      return json({ status: "error", uncertain: false }, 409);
    }
    const config = backend.config, client = gateway.clientMeta(request.headers), bffHeaders = createBffHeaders(process.env), signal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.max(30_000, config.timeoutMs))]);
    const reply = await runVerification(command.data, {
      store: activeStore, binding: { binding: initial.binding, purpose: command.data.purpose }, signal,
      cookie: flowCookie.status === "found" ? flowCookie.value : undefined,
      current: async () => (await resolve(false))?.binding === initial.binding,
      account: initial.session ? { id: initial.session.identity.accountId, subjectType: initial.session.identity.subjectType } : undefined,
      async call(path, body) {
        const response = await fetch(new URL(path, config.origin), { method: body === undefined ? "GET" : "POST", cache: "no-store", credentials: "omit", redirect: "error", signal,
          headers: { Accept: "application/json", ...bffHeaders(client), ...(initial.session ? { Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
        return readBackendResponse(response, "profileRead");
      },
    });
    if (reply.flowCookie) {
      const change = reply.flowCookie.action === "clear" ? cookies.cookies.clearFlow() : cookies.cookies.issueFlow(reply.flowCookie.value, reply.flowCookie.maxAgeSeconds);
      if (!change) return json({ status: "error", uncertain: true }, 503);
      headers.append("Set-Cookie", change);
    }
    return json(reply.body, reply.httpStatus);
  } catch { return json({ status: "error", uncertain: true }, 503); }
}
