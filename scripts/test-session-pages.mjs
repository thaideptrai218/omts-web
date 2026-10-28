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
// Use the real built product in API mode, deliberately without Redis credentials.
// No backend, seed or user data is changed. Only this owned child is stopped.
const env = { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
  OMTS_DATA_SOURCE: "api", OMTS_API_BASE_URL: "https://not-called.invalid", OMTS_API_TIMEOUT_MS: "1000",
  OMTS_WEB_ORIGIN: origin, OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev" };
// HTTP loopback config is intentionally refused in production. For the public
// source switch check below, use an HTTPS cookie profile and a fixed Web origin.
env.OMTS_WEB_ORIGIN = "https://web.example.test";
env.OMTS_WEB_COOKIE_PROFILE = "https";
for (const name of Object.keys(env)) {
  if (name.includes("SESSION_REDIS") || name.includes("SESSION_KEYRING") || name.includes("SESSION_ACTIVE_KEY")) delete env[name];
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
function privateFree(body) {
  for (const value of ["Chủ HTX Trung Nam", "Lê Minh Hải", "Nguyễn Văn An", "demo123"]) {
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
  const chunks = fileURLToPath(new URL("../.next/static/chunks/", import.meta.url));
  const assets = readdirSync(chunks);
  const compiledAssetText = (extension) => assets.filter((name) => name.endsWith(extension)).map((name) => readFileSync(new URL(`../.next/static/chunks/${name}`, import.meta.url), "utf8")).join("\n");
  checks += checkSidebarStyles(compiledAssetText(".css"), compiledAssetText(".js"));
  for (const path of ["/dashboard", "/account", "/employees", "/access/accounts", "/access/roles", "/cooperative/profile", "/farming/zones", "/farming/rafts"]) {
    const response = await get(path);
    const body = await response.text();
    assert.ok(response.headers.get("location") === "/login" || body.includes("/login"), "Missing anonymous redirect");
    privateFree(body);
    checks++;
  }
  const anonymous = await get("/api/auth/session");
  assert.equal(anonymous.status, 401);
  assert.ok(anonymous.headers.get("cache-control").includes("no-store"));
  assert.equal(anonymous.headers.get("set-cookie"), null);
  checks += 3;
  const invalid = await get("/dashboard", { Cookie: "__Host-omts_web_sid=bad" });
  const invalidBody = await invalid.text();
  assert.ok(invalid.headers.get("location") === "/session/recover" || invalidBody.includes("/session/recover"));
  privateFree(invalidBody);
  checks++;
  const unavailable = await get("/api/auth/session", { Cookie: `__Host-omts_web_sid=${"A".repeat(43)}` });
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get("set-cookie"), null);
  checks += 2;
  const login = await get("/login");
  const loginBody = await login.text();
  assert.ok(loginBody.includes("Chưa thể đăng nhập"));
  assert.ok(!loginBody.includes('name="password"'), "Mock password form remained active in API mode");
  privateFree(loginBody);
  checks += 2;
  const rejected = await fetch(origin + "/api/auth/session/recover", {
    method: "POST", headers: { Origin: "https://foreign.example", "X-OMTS-Request": "web" },
    redirect: "manual", signal: AbortSignal.timeout(5000),
  });
  assert.equal(rejected.status, 403);
  assert.equal(rejected.headers.get("set-cookie"), null);
  checks += 2;
  assert.ok(!logs.includes("demo123"));
  console.log(`PASS: ${checks} built-product assertions (HTTP and compiled UI styles) for API mode, anonymous SSR, cookie recovery and unavailable Redis. TLS/browser not inferred.`);
} finally {
  if (child.exitCode === null) child.kill();
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))]);
}
