import "server-only";
import { DISPLAYED_ACCOUNT_HEADER } from "@/shared/http/session-headers";
import { createCsrfGuard } from "./csrf-guard";
import { getSessionGateway } from "./session-gateway.instance";
import { createSessionCookieHelpers } from "./session-cookies";
import { safeNextPath } from "./safe-next-path";

const noStore = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };

function withCookies(response: Response, cookies: readonly string[]): Response {
  for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);
  return response;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

// A navigation that cannot be refreshed right now. Cookies stay as they are and the page does not
// redirect again, so a backend outage cannot turn into a redirect loop; the link retries by hand.
function retryPage(next: string): Response {
  const body = `<!doctype html><html lang="vi"><meta charset="utf-8"><title>Chưa thể kiểm tra phiên đăng nhập</title>`
    + `<main style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem">`
    + `<h1>Chưa thể kiểm tra phiên đăng nhập</h1><p>Máy chủ chưa phản hồi. Phiên của bạn vẫn được giữ nguyên.</p>`
    + `<p><a href="${escapeHtml(next)}">Thử lại</a></p></main>`;
  return new Response(body, { status: 503, headers: { ...noStore, "Content-Type": "text/html; charset=utf-8", "Retry-After": "5" } });
}

/**
 * Refresh endpoint. GET is the navigation path: proxy.ts redirects an expired page request here and the
 * browser comes back to `next` with fresh cookies. POST is the fetch path used by the client wrapper.
 * Cookies are cleared only when the API definitively refused the refresh token.
 */
export async function handleRefresh(request: Request, method: "GET" | "POST"): Promise<Response> {
  const gateway = getSessionGateway();
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStore });
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  const sessionCookies = createSessionCookieHelpers(process.env);
  if (sessionCookies.status !== "available") return json({ status: "unavailable" }, 503);
  const cookies = sessionCookies.cookies;
  try {
    const header = request.headers.get("cookie");
    const client = gateway.clientMeta(request.headers);
    if (method === "GET") {
      const next = safeNextPath(new URL(request.url).searchParams.get("next"));
      const outcome = await gateway.refresh(header, client);
      const redirect = (location: string) => new Response(null, { status: 303, headers: { ...noStore, Location: location } });
      if (outcome.status === "refreshed") return withCookies(redirect(next), [...outcome.cookies, cookies.issueMarker()]);
      if (outcome.status === "rejected") return withCookies(redirect("/login"), cookies.clear());
      if (outcome.status === "no-refresh-token") return redirect("/login");
      return retryPage(next);
    }
    const guard = createCsrfGuard(process.env);
    if (guard.status !== "available") return json({ status: "unavailable" }, 503);
    const check = await guard.guard.check(request, { method: "POST", body: "none", timeoutMs: 5000 });
    if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
    const outcome = await gateway.refresh(header, client);
    if (outcome.status === "refreshed") {
      // The cookies are valid for whoever holds this browser; only the stale page must reload.
      const displayed = request.headers.get(DISPLAYED_ACCOUNT_HEADER);
      const stale = displayed !== null && displayed.toLowerCase() !== outcome.session.identity.accountId.toLowerCase();
      return withCookies(json(stale ? { status: "reload-required" } : { status: "refreshed" }, stale ? 409 : 200), outcome.cookies);
    }
    if (outcome.status === "rejected") return withCookies(json({ status: "session-expired" }, 401), cookies.clear());
    if (outcome.status === "no-refresh-token") return json({ status: "session-expired" }, 401);
    return json({ status: "unavailable" }, 503);
  } catch { return json({ status: "unavailable" }, 503); }
}
