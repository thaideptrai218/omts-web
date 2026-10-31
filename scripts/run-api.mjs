import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const config = fileURLToPath(new URL("../.env.api.local", import.meta.url));
if (!existsSync(config)) throw new Error("Create .env.api.local from the API settings in .env.example before starting.");
process.loadEnvFile(config);
if (process.env.OMTS_DATA_SOURCE !== "api") throw new Error("API configuration must select OMTS_DATA_SOURCE=api.");
const origin = new URL(process.env.OMTS_WEB_ORIGIN ?? "");
if (!["localhost", "127.0.0.1"].includes(origin.hostname) || origin.protocol !== "http:") throw new Error("This launcher is for local HTTP testing only.");
// A built application may be exercised on loopback in test mode. Production
// keeps requiring HTTPS; this launcher never changes that server policy.
if (process.argv.includes("--production")) process.env.NODE_ENV = "test";
const child = spawn(process.execPath, [fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url)),
  process.argv.includes("--production") ? "start" : "dev", "--hostname", "127.0.0.1", "--port", origin.port || "3002"],
  { cwd: root, env: process.env, stdio: "inherit", windowsHide: true });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
