import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const path = fileURLToPath(new URL("../.env.api.local", import.meta.url));
const values = [
  "OMTS_DATA_SOURCE=api", "OMTS_API_BASE_URL=http://127.0.0.1:8080", "OMTS_API_TIMEOUT_MS=5000",
  "OMTS_WEB_ORIGIN=http://localhost:3002", "OMTS_WEB_COOKIE_PROFILE=http-loopback-dev",
  "OMTS_WEB_SESSION_ACTIVE_KEY_ID=local-api-1", `OMTS_WEB_SESSION_KEYRING=local-api-1=${randomBytes(32).toString("base64url")}`,
  "OMTS_WEB_SESSION_REDIS_URL=redis://127.0.0.1:6380/1", "OMTS_WEB_SESSION_REDIS_CONNECT_TIMEOUT_MS=1500",
  "OMTS_WEB_SESSION_REDIS_COMMAND_TIMEOUT_MS=1500", "OMTS_WEB_SESSION_REDIS_NAMESPACE=omts-web-api-local",
  "OMTS_WEB_AUTH_CONTEXT_IDLE_TTL_MS=1800000", "OMTS_WEB_AUTH_PENDING_TIMEOUT_MS=120000",
];
try {
  writeFileSync(path, values.join("\n") + "\n", { flag: "wx" });
  console.log("Created ignored .env.api.local with a fresh session key. Key material was not printed.");
} catch (error) {
  if (error?.code === "EEXIST") console.log("Existing .env.api.local preserved.");
  else throw new Error("Unable to create local API configuration.");
}
