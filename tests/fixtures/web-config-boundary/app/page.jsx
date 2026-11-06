"use client";
import { parseServerWebSessionConfig } from "../../../../src/server/config/web-session-config";
import { readSessionCookie } from "../../../../src/server/auth/session-cookie-reader";
import { createSessionCookieHelpers } from "../../../../src/server/auth/session-cookies";
import { createCsrfGuard } from "../../../../src/server/auth/csrf-guard";
import { readMutationBody } from "../../../../src/server/auth/csrf-mutation-body";

export default function InvalidWebConfigClientPage() {
  const result = parseServerWebSessionConfig({ NODE_ENV: "test" });
  const read = readSessionCookie(null, "__Host-omts_web_sid");
  const helpers = createSessionCookieHelpers({ NODE_ENV: "test" });
  const csrf = createCsrfGuard({ NODE_ENV: "test" });
  return <p>{result.status}/{read.status}/{helpers.status}/{csrf.status}/{typeof readMutationBody}</p>;
}
