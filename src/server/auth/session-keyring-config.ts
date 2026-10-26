import "server-only";

import { createSecretKey, type KeyObject } from "node:crypto";
import { z } from "zod";
import type { SessionKeyProvider } from "./session-token-keys";

const keyId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const environmentInput = z.object({
  OMTS_WEB_SESSION_ACTIVE_KEY_ID: z.string(),
  OMTS_WEB_SESSION_KEYRING: z.string().min(1).max(4096),
  NEXT_PUBLIC_OMTS_WEB_SESSION_ACTIVE_KEY_ID: z.never().optional(),
  NEXT_PUBLIC_OMTS_WEB_SESSION_KEYRING: z.never().optional(),
});

type ConfigField = keyof z.infer<typeof environmentInput>;
export type SessionKeyringConfigResult =
  | Readonly<{ status: "valid"; provider: SessionKeyProvider }>
  | Readonly<{ status: "invalid-config"; fields: readonly ConfigField[] }>;

function invalid(fields: readonly ConfigField[]): SessionKeyringConfigResult {
  return Object.freeze({
    status: "invalid-config",
    fields: Object.freeze([...new Set(fields)]),
  });
}

function decodeKey(value: string): KeyObject | undefined {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) return undefined;

  const bytes = Buffer.from(value, "base64url");
  try {
    if (bytes.length !== 32 || bytes.toString("base64url") !== value) return undefined;
    return createSecretKey(bytes);
  } finally {
    bytes.fill(0);
  }
}

function parseEntries(value: string): Map<string, KeyObject> | undefined {
  const entries = value.split(",");
  if (entries.length === 0 || entries.length > 8) return undefined;

  const keys = new Map<string, KeyObject>();
  for (const entry of entries) {
    const separator = entry.indexOf("=");
    if (separator <= 0 || entry.indexOf("=", separator + 1) !== -1) return undefined;

    const id = entry.slice(0, separator);
    const encoded = entry.slice(separator + 1);
    const parsedId = keyId.safeParse(id);
    const key = decodeKey(encoded);
    if (!parsedId.success || key === undefined || keys.has(parsedId.data)) return undefined;
    keys.set(parsedId.data, key);
  }

  return keys;
}

/**
 * Builds an opaque key provider from explicitly supplied server configuration.
 * Format: key-id=base64url-32-bytes[,older-key-id=base64url-32-bytes].
 */
export function parseServerSessionKeyring(
  environment: Readonly<Record<string, unknown>>,
): SessionKeyringConfigResult {
  try {
    const parsed = environmentInput.safeParse(environment);
    if (!parsed.success) {
      const fields = parsed.error.issues
        .map((issue) => issue.path[0])
        .filter((field): field is ConfigField =>
          typeof field === "string" && Object.hasOwn(environmentInput.shape, field),
        );
      return invalid(fields);
    }

    const activeId = keyId.safeParse(parsed.data.OMTS_WEB_SESSION_ACTIVE_KEY_ID);
    const keys = parseEntries(parsed.data.OMTS_WEB_SESSION_KEYRING);
    if (!activeId.success) return invalid(["OMTS_WEB_SESSION_ACTIVE_KEY_ID"]);
    if (keys === undefined) return invalid(["OMTS_WEB_SESSION_KEYRING"]);
    if (!keys.has(activeId.data)) {
      return invalid([
        "OMTS_WEB_SESSION_ACTIVE_KEY_ID",
        "OMTS_WEB_SESSION_KEYRING",
      ]);
    }

    const provider: SessionKeyProvider = Object.freeze({
      async active() {
        const key = keys.get(activeId.data);
        if (key === undefined) throw new Error("Session key unavailable");
        return Object.freeze({ keyId: activeId.data, key });
      },
      async byId(id: string) {
        return keys.get(id);
      },
    });

    return Object.freeze({ status: "valid", provider });
  } catch {
    return invalid([]);
  }
}
