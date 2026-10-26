import { createCookieFixture } from "../../server";
export const dynamic = "force-dynamic";
export function GET() {
  try { createCookieFixture(process.env); } catch {
    return new Response("Fixture disabled", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const target = process.env.OMTS_COOKIE_FIXTURE_ORIGIN;
  // Controlled loopback-only target validated above; fake bodyless form, no PII.
  return new Response(`<!doctype html><html lang="en"><body>
    <h1>Cross-origin fixture form</h1><form method="post" action="${target}/check/clear"></form>
    <script>document.querySelector('form').submit()</script></body></html>`, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
