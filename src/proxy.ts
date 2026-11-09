import { NextResponse, type NextRequest } from "next/server";
import { readAccessTokenClaims } from "@/server/auth/access-token-claims";
import { sessionCookieNames, type SessionCookieNames } from "@/server/auth/session-cookie-names";
import {
  AUTH_REJECTION_BEFORE_EXECUTION, AUTH_REJECTION_HEADER, AUTH_REJECTION_RELOAD_REQUIRED, DISPLAYED_ACCOUNT_HEADER,
} from "@/shared/http/session-headers";

// Access tokens are renewed ahead of their end so a page never renders, and a request never starts,
// with a token that lapses in flight.
const PAGE_RENEWAL_SKEW_MS = 30_000;
const API_RENEWAL_SKEW_MS = 10_000;
const noStore = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };

function rejection(status: number, body: Record<string, string>, reason: string): NextResponse {
  return NextResponse.json(body, { status, headers: { ...noStore, [AUTH_REJECTION_HEADER]: reason } });
}

// The routes that work without a session; everything else under /api needs an access token.
function isAnonymousApi(pathname: string): boolean {
  return pathname.startsWith("/api/auth/") || pathname === "/api/verifications";
}

function guardApi(request: NextRequest, names: SessionCookieNames): NextResponse {
  const claims = readAccessTokenClaims(request.cookies.get(names.access)?.value);
  const now = Date.now();
  const live = claims !== undefined && claims.expiresAtMs > now;
  // Another tab signed in as someone else: this page is showing the wrong account and must reload.
  const displayed = request.headers.get(DISPLAYED_ACCOUNT_HEADER);
  if (displayed !== null && live && displayed.toLowerCase() !== claims.accountId.toLowerCase()) {
    return rejection(409, { status: "reload-required" }, AUTH_REJECTION_RELOAD_REQUIRED);
  }
  // Refused here, before any handler ran or any backend call was made, so the client can renew the
  // token and send the same request again even when it is a write.
  if (!isAnonymousApi(request.nextUrl.pathname) && (!claims || claims.expiresAtMs - API_RENEWAL_SKEW_MS <= now)) {
    return rejection(401, { status: "session-expired" }, AUTH_REJECTION_BEFORE_EXECUTION);
  }
  return NextResponse.next();
}

function clearMarker(response: NextResponse, names: SessionCookieNames, secure: boolean): NextResponse {
  response.cookies.set({ name: names.marker, value: "", path: "/", maxAge: 0, httpOnly: true, secure, sameSite: "lax" });
  return response;
}

function guardPage(request: NextRequest, names: SessionCookieNames, secure: boolean): NextResponse {
  // Server Function calls and other writes are never redirected into a refresh.
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();
  const claims = readAccessTokenClaims(request.cookies.get(names.access)?.value);
  const marker = request.cookies.has(names.marker);
  if (claims && claims.expiresAtMs - PAGE_RENEWAL_SKEW_MS > Date.now()) {
    return marker ? clearMarker(NextResponse.next(), names, secure) : NextResponse.next();
  }
  // A refresh redirect brought the browser back here a moment ago and it still holds no usable access
  // cookie (cookies blocked, refresh answered without one). Stop: the page treats it as signed out.
  if (marker) return clearMarker(NextResponse.next(), names, secure);
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  // Built on the configured origin, never on a Host header the browser or a proxy chose.
  let target: URL;
  try { target = new URL("/api/auth/refresh", process.env.OMTS_WEB_ORIGIN ?? request.url); }
  catch { target = new URL("/api/auth/refresh", request.url); }
  target.searchParams.set("next", next);
  return NextResponse.redirect(target);
}

export function proxy(request: NextRequest): NextResponse {
  // Mock review mode has no sessions; a misconfigured profile is reported by the route handlers.
  const profile = process.env.OMTS_WEB_COOKIE_PROFILE;
  if (process.env.OMTS_DATA_SOURCE !== "api" || (profile !== "https" && profile !== "http-loopback-dev")) return NextResponse.next();
  const names = sessionCookieNames(profile);
  return request.nextUrl.pathname.startsWith("/api/")
    ? guardApi(request, names)
    : guardPage(request, names, profile === "https");
}

// Prefetches are excluded here because the proxy cannot see the router's own headers. Soft navigations
// are not excluded: they reach the proxy like any other request.
export const config = {
  matcher: [
    "/api/:path*",
    {
      source: "/(dashboard|access|account|audit|cooperative|employees|farming|notifications|operations|system|trader-requests|workspace|onboarding)/:path*",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
