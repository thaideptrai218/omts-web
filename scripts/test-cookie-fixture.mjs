import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { checkCookieFixture } from "./cookie-fixture-checks.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const fixture = fileURLToPath(new URL("../tests/fixtures/cookie-browser", import.meta.url));
const next = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const serve = process.argv.includes("--serve");
const port = await new Promise((resolve, reject) => {
  const socket = createServer();
  socket.once("error", reject);
  socket.listen(0, "127.0.0.1", () => {
    const address = socket.address();
    socket.close(() => address && typeof address !== "string" ? resolve(address.port) : reject(new Error("No fixture port")));
  });
});
const origin = `http://127.0.0.1:${port}`;
const runId = randomUUID();
const env = { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
  OMTS_COOKIE_FIXTURE_ENABLED: "isolated-test-only", OMTS_COOKIE_FIXTURE_ORIGIN: origin, OMTS_COOKIE_FIXTURE_RUN_ID: runId };

async function exercise(compiler) {
  const built = spawnSync(process.execPath, [next, "build", fixture, compiler], {
    cwd: root, encoding: "utf8", windowsHide: true, timeout: 60_000, maxBuffer: 2 * 1024 * 1024, env,
  });
  if (built.status !== 0 || built.error) {
    console.error((built.stdout ?? "") + (built.stderr ?? ""));
    throw new Error(`Cookie fixture ${compiler} build failed (exit=${built.status}, signal=${built.signal}, error=${built.error?.code ?? "none"})`);
  }
  const child = spawn(process.execPath, [next, "start", fixture, "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env,
  });
  let failed;
  child.once("error", (error) => { failed = error; });
  child.stdout.resume(); child.stderr.resume();
  const exited = new Promise((resolve) => child.once("exit", resolve));
  try {
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      if (failed || child.exitCode !== null) throw new Error("Owned fixture failed to start");
      try {
        const response = await fetch(origin + "/check/probe", { signal: AbortSignal.timeout(500) });
        const value = await response.json();
        if (value.runId !== runId) throw new Error("Port is not owned by this fixture");
        ready = true; break;
      } catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
    }
    if (!ready) throw new Error("Cookie fixture readiness failed");
    const checks = await checkCookieFixture(origin, runId);
    console.log(`PASS: ${compiler} Next HTTP fixture (${checks} assertions); browser/TLS not inferred.`);
    if (serve) {
      console.log(`BROWSER_FIXTURE_READY ${origin}`);
      console.log("HTTP fake-cookie fixture only. Press Ctrl+C to stop its owned child.");
      await Promise.race([
        new Promise((resolve) => { process.once("SIGINT", resolve); process.once("SIGTERM", resolve); }),
        exited.then(() => { throw new Error("Owned fixture exited during browser verification"); }),
      ]);
    }
  } finally {
    // This child was created above; never stop a process found by port/name.
    if (child.exitCode === null) child.kill();
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))]);
  }
}
try {
  for (const compiler of serve ? ["--turbopack"] : ["--webpack", "--turbopack"]) await exercise(compiler);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Cookie fixture failed");
  process.exitCode = 1;
}
