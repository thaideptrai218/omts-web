import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

// Read-only business checks against the existing local demo. Authentication
// creates and then revokes only this script's sessions; no seed or data reset.
const origin = new URL(process.env.OMTS_QA_WEB_ORIGIN ?? "http://localhost:3002");
if (origin.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(origin.hostname) || origin.pathname !== "/") throw new Error("Use a local QA origin");
const password = process.env.OMTS_QA_PASSWORD;
if (!password) throw new Error("Set OMTS_QA_PASSWORD to the local demo password");
const branch = process.env.OMTS_QA_BRANCH_API === "1", results = [], clients = [];
class Client {
  cookies = new Map();
  constructor(username) { this.username = username; }
  async request(path, body) {
    const response = await fetch(new URL(path, origin), { method: body === undefined ? "GET" : "POST", redirect: "manual", signal: AbortSignal.timeout(45_000),
      headers: { Cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; "), ...(body === undefined ? {} : { Origin: origin.origin, "X-OMTS-Request": "web", ...(body === true ? {} : { "Content-Type": "application/json" }) }) }, body: body === undefined || body === true ? undefined : JSON.stringify(body) });
    for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(";")[0], at = pair.indexOf("="); this.cookies.set(pair.slice(0, at), pair.slice(at + 1)); }
    const json = response.headers.get("content-type")?.includes("application/json"), data = json ? await response.json() : await response.arrayBuffer();
    if (json) assert.ok(!/"(?:accessToken|refreshToken|passwordHash)"\s*:/.test(JSON.stringify(data)), "Private credentials in BFF response");
    return { response, data };
  }
  async check(path, expected, body) {
    const value = await this.request(path, body); assert.equal(value.response.status, expected, `${this.username ?? "anonymous"} ${path}`);
    if (path.startsWith("/api/")) assert.ok(value.response.headers.get("cache-control")?.includes("no-store"));
    results.push({ actor: this.username ?? "anonymous", path: path.split("?")[0], expected, actual: value.response.status }); return value.data;
  }
  async login() { await this.check("/api/auth/bootstrap", 200, true); await this.check("/api/auth/login", 200, { identifier: this.username, password }); clients.push(this); }
  async logout() { const state = await this.check("/api/auth/bootstrap", 200, true); await this.check("/api/auth/logout", 200, { expectedRevision: state.revision }); await this.check("/api/auth/session", 401); }
}
try {
  const owner = new Client("owner"); await owner.login();
  const zones = (await owner.check("/api/workspace/zones?pageSize=100", 200)).data.items;
  const zone1 = zones.find((row) => row.code === "DEMO-01"), zone2 = zones.find((row) => row.code === "DEMO-02"); assert.ok(zone1 && zone2);
  const supplier = (await owner.check("/api/workspace/suppliers?pageSize=100", 200)).data.items[0];
  const roles = (await owner.check("/api/workspace/roles", 200)).data.items;
  const accounts = (await owner.check("/api/workspace/accounts?pageSize=100", 200)).data.items;
  const account = accounts.find((row) => row.username === "quanlyvung1"); assert.ok(account && supplier && roles[0]);
  const raft = (await owner.check(`/api/workspace/rafts?zoneId=${zone1.id}`, 200)).data.items[0]; assert.ok(raft);
  const receipt = (await owner.check(`/api/operations/purchase-receipts?zoneId=${zone1.id}`, 200)).data.page.items[0]; assert.ok(receipt);
  for (const username of ["owner", "quanlyvung1", "quanlyvung2", "ketoan", "thuonglai1"]) {
    const c = username === "owner" ? owner : new Client(username); if (c !== owner) await c.login();
    const isOwner = username === "owner", isTrader = username === "thuonglai1", accountant = username === "ketoan";
    const zone = username === "quanlyvung2" ? zone2 : zone1, ownBusiness = !isTrader;
    const profile = (await c.check("/api/account/profile", 200)).data; assert.equal(profile.username, username);
    await c.check("/api/auth/session", 200); await c.check("/api/account/notification-preferences", 200);
    for (const resource of ["zones", "suppliers", "input-items"]) await c.check(`/api/workspace/${resource}`, ownBusiness ? 200 : 403);
    for (const resource of ["employees", "accounts", "roles"]) await c.check(`/api/workspace/${resource}`, isOwner ? 200 : 403);
    await c.check("/api/cooperative/profile", isOwner ? 200 : 403); await c.check("/api/permission-functions", isOwner ? 200 : 403);
    await c.check(`/api/role-impact?roleId=${roles[0].id}`, isOwner ? 200 : 403); await c.check(`/api/account-grants?accountId=${account.id}`, isOwner ? 200 : 403);
    await c.check(`/api/supplier-documents?id=${supplier.id}`, ownBusiness ? 200 : 403);
    const map = await c.check("/api/zone-map?includeDiscontinued=true", ownBusiness ? 200 : 403);
    if (username.startsWith("quanlyvung")) assert.deepEqual(map.data.map((row) => row.id), [zone.id]);
    await c.check(`/api/operations/purchase-receipts?zoneId=${zone.id}`, ownBusiness ? 200 : 403);
    await c.check("/api/operations/supplier-payments", isOwner || accountant ? 200 : 403);
    await c.check("/api/operations/supplier-payments?action=debts", isOwner || accountant ? 200 : 403);
    await c.check(`/api/operations/water?zoneId=${zone.id}`, isOwner || username.startsWith("quanlyvung") ? 200 : 403);
    await c.check(`/api/operations/water?action=chart&zoneId=${zone.id}`, isOwner || username.startsWith("quanlyvung") ? 200 : 403);
    await c.check(`/api/operations/zone-licenses?action=list&zoneId=${zone.id}`, isOwner ? 200 : 403);
    await c.check(`/api/operations/raft-details?action=condition&id=${raft.id}`, isOwner || accountant || username === "quanlyvung1" ? 200 : 403);
    await c.check(`/api/operations/purchase-receipts?action=detail&id=${receipt.id}`, isOwner || accountant || username === "quanlyvung1" ? 200 : 403);
    if (username.startsWith("quanlyvung")) {
      const other = zone.id === zone1.id ? zone2 : zone1;
      await c.check(`/api/workspace/zones?id=${other.id}`, 403);
      await c.check(`/api/operations/purchase-receipts?zoneId=${other.id}`, 403);
      await c.check(`/api/operations/water?zoneId=${other.id}`, 403);
    }
    await c.check("/api/inbox?page=1", branch ? 200 : 404);
    await c.check("/api/trader-requests?rejected=false", !isOwner ? 403 : branch ? 200 : 404);
    await c.check("/dashboard", 200); await c.check("/account", 200);
    console.log(`PASS ${origin.origin} ${username}: own profile, permitted reads, denied administration/foreign zones and HTML entry`);
  }
  const anonymous = new Client();
  for (const path of ["/api/auth/session", "/api/account/profile", "/api/workspace/zones", "/api/operations/purchase-receipts", "/api/inbox", "/api/trader-requests"]) await anonymous.check(path, 401);
  // Once a Suspense shell has streamed, Next sends its redirect instruction
  // inside an HTTP200 document instead of changing the status to307.
  const redirect = await anonymous.request("/dashboard");
  assert.ok([200, 307].includes(redirect.response.status));
  if (redirect.response.status === 200) assert.match(Buffer.from(redirect.data).toString("utf8"), /NEXT_REDIRECT[^\n]*\/login|http-equiv="refresh"[^>]*\/login/);
  else assert.equal(redirect.response.headers.get("location"), "/login");
  results.push({ actor: "anonymous", path: "/dashboard", expected: "redirect-login", actual: redirect.response.status });
} finally {
  for (const c of clients.reverse()) await c.logout();
  if (process.env.OMTS_QA_REPORT) await writeFile(process.env.OMTS_QA_REPORT, JSON.stringify({ origin: origin.origin, branch, results }, null, 2));
}
console.log(`PASS ${results.length} local role checks; no business mutations, script sessions revoked`);
