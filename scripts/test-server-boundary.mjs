import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const next = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
// Next's Webpack build output is capped at five errors. Keep independent groups
// at/below that cap instead of accepting a generic build failure as evidence.
const cases = [
  { directory: "server-boundary", modules: ["backend-config", "backend-transport", "server-auth-tokens", "browser-dto", "backend-diagnostic"] },
  { directory: "web-config-boundary", modules: ["web-session-config", "session-cookie-reader", "session-cookies", "csrf-guard", "csrf-mutation-body"] },
  { directory: "expiry-boundary", modules: ["session-expiry"] },
  { directory: "session-runtime-boundary", modules: ["session-keyring-config", "server-session-runtime-config", "server-session-runtime", "application-context-dal", "function-capability-guard"] },
  { directory: "session-access-boundary", modules: ["server-session-runtime-owner", "protected-access-decision", "login-session-service", "login-http", "pending-login-delivery"] },
  { directory: "session-routes-boundary", modules: ["session-destinations", "session-gateway", "session-gateway.instance", "session-http", "next-session-access"] },
];

function verifyBoundary(compiler, test) {
  const fixture = fileURLToPath(new URL(`../tests/fixtures/${test.directory}`, import.meta.url));
  // Request explicit diagnostics: the default command can print only a summary.
  const result = spawnSync(process.execPath, [next, "build", fixture, compiler, "--debug"], {
    cwd: root, encoding: "utf8", windowsHide: true, timeout: 45_000, maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  const output = (result.stdout ?? "") + (result.stderr ?? "");
  if (result.error || result.status !== 1 || !output.includes("server-only")
    || !test.modules.every((name) => output.includes(name))
    || !/Client Component|Server Component|use client/.test(output)) {
    console.error(output.slice(-4000));
    throw new Error(`FAIL: ${compiler}/${test.directory} did not produce the expected server-only boundary rejection.`);
  }
  console.log(`PASS: ${compiler}/${test.directory} rejected Client Component imports of all ${test.modules.length} server modules.`);
}

try {
  for (const compiler of ["--webpack", "--turbopack"]) {
    for (const test of cases) verifyBoundary(compiler, test);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Boundary verification failed");
  process.exitCode = 1;
}
