import assert from "node:assert/strict";

// Real HTTP checks, NOT a browser cookie jar. The browser suite is separate.
export async function checkCookieFixture(origin, runId) {
  let checks = 0;
  function check(condition, label) { assert(condition, label); checks++; }
  const send = (action, options = {}) => fetch(origin + "/check/" + action, {
    redirect: "error", signal: AbortSignal.timeout(5000), ...options,
  });
  const post = (action, headers = {}, body = action === "clear" ? undefined : "{}") => send(action, {
    method: "POST", body, headers: { Origin: origin, "X-OMTS-Request": "web",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
  });
  const initial = await send("probe");
  const first = await initial.json();
  check(first.fixture === "cookie-browser-v1" && first.runId === runId, "Expected owned fixture process");
  check(initial.headers.get("cache-control") === "no-store" && first.cookie === "missing", "Initial probe no-store/missing");
  for (const method of ["GET", "OPTIONS"]) {
    const denied = await send("issue", { method });
    check(denied.status === 405 && denied.headers.get("allow") === "POST" && !denied.headers.has("set-cookie"), "Safe/preflight method must not issue;405 supplies Allow");
    check(!denied.headers.has("access-control-allow-origin"), "No BFF CORS allowlist expansion");
    await denied.arrayBuffer();
  }
  const issued = await post("issue");
  const header = issued.headers.get("set-cookie");
  check(issued.status === 200 && header === "omts_web_sid_dev=" + "A".repeat(43) + "; Path=/; HttpOnly; SameSite=Lax", "Exact dev session cookie flags");
  check(!JSON.stringify(await issued.json()).includes("A".repeat(43)), "No SID in response JSON");
  const cookie = header.split(";")[0];
  for (const path of ["/check/probe", "/outside"]) {
    const response = await fetch(origin + path, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(5000) });
    const value = await response.json();
    check(value.cookie === "fixture-cookie" && response.headers.get("cache-control") === "no-store", "Cookie read/no-store on independent path");
  }
  for (const [headers, expected] of [
    [{ Origin: "http://localhost:" + new URL(origin).port }, 403], [{ "X-OMTS-Request": "wrong" }, 403],
    [{ "Sec-Fetch-Site": "same-site" }, 403], [{ "Content-Type": "text/plain" }, 415],
  ]) {
    const response = await post("issue", { Cookie: cookie, ...headers });
    check(response.status === expected && !response.headers.has("set-cookie"), "Rejected mutation must not emit cookie");
    await response.arrayBuffer();
  }
  for (const foreign of ["omts_web_sid_dev=bad", "omts_web_sid_dev=" + "B".repeat(42) + "A", cookie + "; " + cookie]) {
    const response = await post("clear", { Cookie: foreign });
    check(response.status === 409 && !response.headers.has("set-cookie"), "Foreign/ambiguous cookie must not be cleared");
    await response.arrayBuffer();
  }
  for (const [action, body] of [["clear", "{}"], ["issue", "x".repeat(1025)]]) {
    const response = await post(action, { Cookie: cookie }, body);
    check(response.status === 413 && !response.headers.has("set-cookie"), "Real HTTP body overflow cannot mutate fixture");
    await response.arrayBuffer();
  }
  const unchanged = await (await send("probe", { headers: { Cookie: cookie } })).json();
  check(unchanged.writes === 1 && unchanged.expiry === "active", "Rejected requests leave fixture state unchanged");
  await (await post("expire", { Cookie: cookie })).arrayBuffer();
  const expired = await (await send("probe", { headers: { Cookie: cookie } })).json();
  check(expired.expiry === "expired" && expired.cookie === "fixture-cookie", "Clock expiry is not browser cookie clearing");
  const cleared = await post("clear", { Cookie: cookie });
  check(cleared.headers.get("set-cookie") === "omts_web_sid_dev=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT", "Exact-scope clear header");
  check(cleared.headers.get("cache-control") === "no-store", "Clear response no-store");
  await cleared.arrayBuffer();
  check((await (await send("probe")).json()).cookie === "missing", "No request cookie is not fabricated as found");
  return checks;
}
