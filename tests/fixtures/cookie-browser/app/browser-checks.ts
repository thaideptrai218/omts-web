import { crossOriginFormCheck } from "./cross-origin-check";

export async function runBrowserChecks(log: (text: string) => void) {
  function assert(value: boolean, label: string) { if (!value) throw new Error(label); log("PASS: " + label); }
  const probe = async (path = "/check/probe") => (await fetch(path, { cache: "no-store" })).json();
  const mutate = (action: string, marked = true, type = "application/json") => fetch("/check/" + action, {
    method: "POST", headers: { ...(marked ? { "X-OMTS-Request": "web" } : {}), ...(action === "clear" ? {} : { "Content-Type": type }) },
    body: action === "clear" ? undefined : "{}", cache: "no-store",
  });
  const before = await probe();
  assert(before.cookie === "missing", "preflight has no existing SID (foreign cookies are never replaced)");
  const issued = await mutate("issue");
  assert(issued.ok, "same-origin browser JSON request passed C2A");
  assert(issued.headers.get("set-cookie") === null, "browser JavaScript cannot read Set-Cookie");
  assert(issued.headers.get("cache-control") === "no-store", "mutation response is no-store");
  const active = await probe();
  assert(active.cookie === "fixture-cookie" && active.expiry === "active", "browser stored and sent the fake HttpOnly SID");
  assert(!document.cookie.split(";").some((part) => part.trim().startsWith("omts_web_sid_dev=")), "HttpOnly SID is absent from document.cookie");
  assert((await probe("/outside")).cookie === "fixture-cookie", "Path=/ sends the cookie outside the issuing route branch");
  assert((await mutate("clear", false)).status === 403, "bodyless mutation without marker is rejected");
  assert((await mutate("issue", true, "text/plain")).status === 415, "browser simple media type is rejected");
  log("PASS: " + await crossOriginFormCheck());
  const afterRejects = await probe();
  assert(afterRejects.cookie === "fixture-cookie" && afterRejects.writes === active.writes, "rejected requests neither mutate state nor clear SID");
  assert((await mutate("expire")).ok, "only the fixture fake clock advanced");
  const expired = await probe();
  assert(expired.expiry === "expired" && expired.cookie === "fixture-cookie", "C3A expiry does not pretend the browser cookie was deleted");
  const cleared = await mutate("clear");
  assert(cleared.ok && (await probe()).cookie === "missing", "browser applied the exact-scope clear cookie");
  assert((await probe("/outside")).cookie === "missing", "cleared SID is not sent on another path");
  log("DONE: HTTP loopback checks only; HTTPS Secure/__Host- remain unverified.");
}
