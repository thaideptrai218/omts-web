import "server-only";
import { hashSessionId } from "./session-id";
import type { ServerWebSessionConfig } from "../config/web-session-config";

type CookieName = ServerWebSessionConfig["cookie"]["name"];
export type SessionCookieReadResult = Readonly<{ status: "found"; idHash: string }>
  | Readonly<{ status: "missing" | "invalid-cookie" }>;
const missing: SessionCookieReadResult = Object.freeze({ status: "missing" });
const invalid: SessionCookieReadResult = Object.freeze({ status: "invalid-cookie" });
const token = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const cookieValue = /^(?:[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]*|"[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]*")$/;

// Read the raw Cookie header, NOT a map that has already collapsed duplicates.
// A lookup hash is not authentication, proof of scope, or evidence of expiry.
export function readSessionCookie(header: unknown, name: CookieName): SessionCookieReadResult {
  if (name !== "__Host-omts_web_sid" && name !== "omts_web_sid_dev") return invalid;
  if (header === null || header === undefined || header === "") return missing;
  // Technical parser budget, not an account/session lifetime policy. ASCII only.
  if (typeof header !== "string" || header.length > 16_384 || /[^\x20-\x7e\t]/.test(header)) return invalid;
  let sid: string | undefined;
  for (const segment of header.split(";")) {
    const pair = segment.replace(/^[ \t]+|[ \t]+$/g, "");
    const separator = pair.indexOf("=");
    if (separator < 1) return invalid;
    const key = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    if (!token.test(key) || !cookieValue.test(value)) return invalid;
    if (key !== name) continue;
    if (sid !== undefined) return invalid;
    sid = value;
  }
  if (sid === undefined) return missing;
  // Do not unquote, percent-decode, trim or otherwise normalize the SID.
  const idHash = hashSessionId(sid);
  return idHash ? Object.freeze({ status: "found", idHash }) : invalid;
}
