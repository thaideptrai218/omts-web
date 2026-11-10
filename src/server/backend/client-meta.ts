import "server-only";
import { isIP } from "node:net";
import type { ClientIpSource } from "../config/bff-client-config";

// End-user metadata the API may record on a session. It only reaches the API together with
// the shared secret, so a browser can never choose its own address through the BFF.
export type ClientMeta = Readonly<{ ip?: string; userAgent?: string }>;

function validAddress(value: string | null | undefined): string | undefined {
  const text = value?.trim();
  return text && text.length <= 45 && isIP(text) !== 0 ? text : undefined;
}

function readAddress(headers: Headers, source: ClientIpSource): string | undefined {
  switch (source.kind) {
    case "none": return undefined;
    // Set by the platform edge on every request; a client-sent copy is overwritten.
    case "vercel": return validAddress(headers.get("x-vercel-forwarded-for")?.split(",")[0]);
    case "real-ip": return validAddress(headers.get("x-real-ip"));
    case "forwarded-for": {
      // Each trusted proxy appends the address it saw, so the entry `trustedHops` from the
      // right is the first one a proxy of ours (not the client) vouches for.
      const entries = (headers.get("x-forwarded-for") ?? "").split(",").map((entry) => entry.trim());
      return validAddress(entries[entries.length - source.trustedHops]);
    }
  }
}

export function readClientMeta(headers: Headers, source: ClientIpSource): ClientMeta {
  const raw = headers.get("user-agent");
  // Header values must stay printable ASCII; the API stores a bounded string.
  const userAgent = raw ? raw.replace(/[^\x20-\x7e]/g, "").trim().slice(0, 512) : "";
  const ip = readAddress(headers, source);
  return Object.freeze({ ...(ip ? { ip } : {}), ...(userAgent ? { userAgent } : {}) });
}
