import "server-only";
import { createSessionCookieHelpers } from "../../../src/server/auth/session-cookies";
import { createCsrfGuard } from "../../../src/server/auth/csrf-guard";
import { deriveAccessBoundExpiry, checkAccessBoundExpiry } from "../../../src/server/auth/session-expiry";
import { hashSessionId } from "../../../src/server/auth/session-id";

const fakeSid = "A".repeat(43); // Public fixture bytes, never a real backend session.
const initialTime = Date.UTC(2026, 9, 24, 8);
const noStore = { "Cache-Control": "no-store", Pragma: "no-cache" };

export function createCookieFixture(environment: Readonly<Record<string, unknown>>) {
  const origin = environment.OMTS_COOKIE_FIXTURE_ORIGIN;
  const runId = environment.OMTS_COOKIE_FIXTURE_RUN_ID;
  // A production Next build hosts a deliberately TEST-only HTTP policy. No
  // environment fallback, LAN binding, real auth/provider/store or certificate.
  if (environment.OMTS_COOKIE_FIXTURE_ENABLED !== "isolated-test-only"
    || typeof origin !== "string" || !/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(origin)
    || typeof runId !== "string" || !/^[a-f0-9-]{36}$/.test(runId)) throw new Error("Cookie fixture disabled");
  const config = { NODE_ENV: "test", OMTS_WEB_ORIGIN: origin, OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev" };
  const parsed = createSessionCookieHelpers(config);
  const csrf = createCsrfGuard(config);
  if (parsed.status !== "available" || csrf.status !== "available") throw new Error("Cookie fixture config invalid");
  const cookies = parsed.cookies;
  let now = initialTime;
  let writes = 0;
  let expiry: ReturnType<typeof deriveAccessBoundExpiry> | undefined;
  function json(data: unknown, status = 200, cookie?: string) {
    return Response.json(data, { status, headers: { ...noStore,
      ...(status === 405 ? { Allow: "POST" } : {}), ...(cookie ? { "Set-Cookie": cookie } : {}) } });
  }
  return async function handle(request: Request, action: string): Promise<Response> {
    const read = cookies.read(request.headers.get("cookie"));
    const foreign = read.status === "invalid-cookie" || (read.status === "found" && read.idHash !== hashSessionId(fakeSid));
    if (request.method === "GET" && action === "probe") {
      return json({ fixture: "cookie-browser-v1", runId, cookie: foreign ? "foreign-cookie" : read.status === "found" ? "fixture-cookie" : "missing",
        expiry: expiry?.status === "active" ? checkAccessBoundExpiry(expiry, () => now).status : "not-issued", writes });
    }
    if (!["issue", "clear", "expire"].includes(action)) return json({ status: "not-found" }, 404);
    const policy = action === "clear" ? { method: "POST", body: "none", timeoutMs: 1000 } as const
      : { method: "POST", body: "json", maxBytes: 1024, timeoutMs: 1000 } as const;
    const checked = await csrf.guard.check(request, policy);
    if (checked.status !== "allowed") return json({ status: checked.status }, checked.status === "rejected" ? checked.httpStatus : 500);
    // Never overwrite/clear another application's cookie, even on a dev host.
    if (foreign) return json({ status: "foreign-cookie-refused" }, 409);
    if (action === "clear") {
      expiry = undefined;
      writes++;
      return json({ status: "cleared", writes }, 200, cookies.clear().readForResponseHeader());
    }
    if (action === "expire") {
      now = initialTime + 1000;
      writes++;
      return json({ status: "clock-advanced", writes });
    }
    now = initialTime;
    expiry = deriveAccessBoundExpiry({ accessTokenExpiresAt: new Date(now + 1000).toISOString(),
      refreshTokenExpiresAt: new Date(now + 60_000).toISOString() }, () => now);
    const issued = cookies.issue(fakeSid);
    if (expiry.status !== "active" || issued.status !== "prepared") return json({ status: "fixture-error" }, 500);
    writes++;
    return json({ status: "issued", writes }, 200, issued.cookie.readForResponseHeader());
  };
}

// Imported only by the isolated fixture Route Handlers, never the product app.
let runtime: ReturnType<typeof createCookieFixture> | undefined;
export async function handleFixture(request: Request, action: string) {
  try {
    runtime ??= createCookieFixture(process.env);
    return await runtime(request, action);
  } catch { return Response.json({ status: "fixture-disabled" }, { status: 503, headers: noStore }); }
}
