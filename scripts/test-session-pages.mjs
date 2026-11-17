import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { checkSidebarStyles } from "./lib/check-sidebar-styles.mjs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const next = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
if (!existsSync(new URL("../.next/BUILD_ID", import.meta.url))) throw new Error("Build the Web application before this check.");
const port = await new Promise((resolve, reject) => {
  const socket = createServer();
  socket.once("error", reject);
  socket.listen(0, "127.0.0.1", () => {
    const address = socket.address();
    socket.close(() => resolve(address.port));
  });
});
const origin = `http://127.0.0.1:${port}`;
// Use the real built product in API mode, deliberately without a session key ring.
// No backend, seed or user data is changed. Only this owned child is stopped.
const env = { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
  OMTS_DATA_SOURCE: "api", OMTS_API_BASE_URL: "https://not-called.invalid", OMTS_API_TIMEOUT_MS: "1000",
  OMTS_WEB_ORIGIN: origin, OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev" };
// HTTP loopback config is intentionally refused in production. For the public
// source switch check below, use an HTTPS cookie profile and a fixed Web origin.
env.OMTS_WEB_ORIGIN = "https://web.example.test";
env.OMTS_WEB_COOKIE_PROFILE = "https";
for (const name of Object.keys(env)) {
  if (name.includes("SESSION_KEYRING") || name.includes("SESSION_ACTIVE_KEY")) delete env[name];
}
const child = spawn(process.execPath, [next, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env,
});
let logs = "";
child.stdout.on("data", (chunk) => { logs = (logs + chunk).slice(-12_000); });
child.stderr.on("data", (chunk) => { logs = (logs + chunk).slice(-12_000); });
const exited = new Promise((resolve) => child.once("exit", resolve));
child.on("error", () => {});
let checks = 0;
async function get(path, headers = {}) {
  return fetch(origin + path, { headers, redirect: "manual", signal: AbortSignal.timeout(5000) });
}
// A page request without a usable access token is sent through GET /api/auth/refresh first (proxy.ts): the
// refresh cookie is scoped to /api/auth, so only that route can tell a signed-out browser from an expired token.
// Follow that one hop on this server (the redirect is built on OMTS_WEB_ORIGIN) and return where it lands.
async function landing(path, headers = {}) {
  const first = await get(path, headers);
  const location = first.headers.get("location");
  if (first.status !== 307 || !location) return { response: first, location, body: await first.text() };
  const hop = new URL(location);
  assert.equal(hop.pathname, "/api/auth/refresh", `${path} must renew through the refresh route`);
  assert.equal(hop.searchParams.get("next"), path, `${path} must come back to itself after renewal`);
  const second = await get(hop.pathname + hop.search, headers);
  return { response: second, location: second.headers.get("location"), body: await second.text() };
}
function privateFree(body) {
  for (const value of ["Chủ HTX Trung Nam", "Lê Minh Hải", "Ngô Nam Trung", "Nguyễn Văn An", "demo123"]) {
    assert.ok(!body.includes(value), `Private/mock account data escaped into ${value}`);
  }
  checks++;
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null) throw new Error("Owned Next child exited during startup");
    try { await get("/"); ready = true; break; } catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  assert.ok(ready, "Next child failed to start");
  const entry = await get("/");
  const entryBody = await entry.text();
  assert.ok(entry.headers.get("location") === "/login" || entryBody.includes("/login"), "Public entry must lead to the real login flow");
  privateFree(entryBody);
  checks++;
  const chunks = fileURLToPath(new URL("../.next/static/chunks/", import.meta.url));
  const assets = readdirSync(chunks);
  const compiledAssetText = (extension) => assets.filter((name) => name.endsWith(extension)).map((name) => readFileSync(new URL(`../.next/static/chunks/${name}`, import.meta.url), "utf8")).join("\n");
  checks += checkSidebarStyles(compiledAssetText(".css"), compiledAssetText(".js"));
  for (const path of ["/dashboard", "/account", "/employees", "/access/accounts", "/access/roles", "/cooperative/profile", "/farming/zones", "/farming/rafts", "/operations/purchase-receipts", "/operations/supplier-payments", "/operations/water"]) {
    const { location, body } = await landing(path);
    assert.ok(location === "/login" || body.includes("/login"), `Missing anonymous redirect: ${path} -> ${location}`);
    privateFree(body);
    checks++;
  }
  const anonymous = await get("/api/auth/session");
  assert.equal(anonymous.status, 401);
  assert.ok(anonymous.headers.get("cache-control").includes("no-store"));
  assert.equal(anonymous.headers.get("set-cookie"), null);
  checks += 3;
  for (const path of ["/api/account-grants?accountId=122bb318-a72e-49aa-a8d7-a6169f889007", "/api/permission-functions", "/api/role-impact?roleId=122bb318-a72e-49aa-a8d7-a6169f889007", "/api/zone-map", "/api/inbox", "/api/trader-requests"]) {
    const privateRead = await get(path);
    assert.equal(privateRead.status, 401, "Access reads must not be static mock-mode responses");
    assert.ok(privateRead.headers.get("cache-control").includes("no-store"));
    assert.equal(privateRead.headers.get("set-cookie"), null);
    checks += 3;
  }
  // An unreadable access cookie is not a session: the page renews, finds no refresh token and signs in again.
  const { location: invalidLocation, body: invalidBody } = await landing("/dashboard", { Cookie: "__Host-omts_at=bad" });
  assert.equal(invalidLocation, "/login", `A bad access cookie must end at the login: ${invalidLocation}`);
  privateFree(invalidBody);
  checks++;
  const login = await get("/login");
  const loginBody = await login.text();
  assert.ok(loginBody.includes("Đăng nhập hệ thống"));
  assert.ok(loginBody.includes('name="password"'), "API credential form is missing");
  privateFree(loginBody);
  checks += 2;
  const rejected = await fetch(origin + "/api/auth/session/recover", {
    method: "POST", headers: { Origin: "https://foreign.example", "X-OMTS-Request": "web" },
    redirect: "manual", signal: AbortSignal.timeout(5000),
  });
  assert.equal(rejected.status, 403);
  assert.equal(rejected.headers.get("set-cookie"), null);
  checks += 2;
  for (const path of ["/recover"]) {
    const publicPage = await get(path), publicBody = await publicPage.text();
    assert.equal(publicPage.status, 200); privateFree(publicBody); checks++;
  }
  const verificationRejected = await fetch(origin + "/api/verifications", { method: "POST", headers: { Origin: "https://foreign.example", "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: JSON.stringify({ op: "read", purpose: "recovery" }), redirect: "manual", signal: AbortSignal.timeout(5000) });
  assert.equal(verificationRejected.status, 403); assert.equal(verificationRejected.headers.get("set-cookie"), null); assert.ok(verificationRejected.headers.get("cache-control").includes("no-store")); checks += 3;
  assert.ok(!logs.includes("demo123"));
  console.log(`PASS: ${checks} built-product assertions (HTTP and compiled UI styles) for API mode, anonymous SSR and cookie recovery. TLS/browser not inferred.`);
} finally {
  if (child.exitCode === null) child.kill();
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))]);
}
