import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fixtureTokens, tokenContext } from "./__tests__/token-protection-fixture";
import { parseServerSessionKeyring } from "./session-keyring-config";
import { createSessionTokenProtector } from "./session-token-protector";

function encodedKey(fill?: number): string {
  return (fill === undefined ? randomBytes(32) : Buffer.alloc(32, fill)).toString(
    "base64url",
  );
}

function environment(active = "key-2026-10") {
  return {
    OMTS_WEB_SESSION_ACTIVE_KEY_ID: active,
    OMTS_WEB_SESSION_KEYRING: [
      `key-2026-09=${encodedKey(9)}`,
      `key-2026-10=${encodedKey(10)}`,
    ].join(","),
  };
}

describe("server session keyring configuration", () => {
  it("selects the active key while retaining older keys for reads", async () => {
    const result = parseServerSessionKeyring(environment());
    expect(result.status).toBe("valid");
    if (result.status !== "valid") throw new Error("Expected a valid keyring");

    const active = await result.provider.active();
    expect(active.keyId).toBe("key-2026-10");
    expect(active.key.type).toBe("secret");
    expect(active.key.symmetricKeySize).toBe(32);
    await expect(result.provider.byId("key-2026-09")).resolves.toMatchObject({
      type: "secret",
      symmetricKeySize: 32,
    });
    await expect(result.provider.byId("missing-key")).resolves.toBeUndefined();
  });

  it("uses only the active key for new envelopes and opens retained-key envelopes", async () => {
    const oldResult = parseServerSessionKeyring(environment("key-2026-09"));
    const currentResult = parseServerSessionKeyring(environment());
    if (oldResult.status !== "valid" || currentResult.status !== "valid") {
      throw new Error("Expected valid keyrings");
    }

    const oldProtector = createSessionTokenProtector(oldResult.provider);
    const currentProtector = createSessionTokenProtector(currentResult.provider);
    const sealed = await oldProtector.protect(fixtureTokens, tokenContext());
    expect(sealed.status).toBe("protected");
    if (sealed.status !== "protected") throw new Error("Expected protected tokens");

    expect(sealed.protectedTokens.keyId).toBe("key-2026-09");
    await expect(
      currentProtector.open(sealed.protectedTokens, tokenContext()),
    ).resolves.toEqual({ status: "opened", tokens: fixtureTokens });
  });

  it.each([
    {},
    { OMTS_WEB_SESSION_ACTIVE_KEY_ID: "key", OMTS_WEB_SESSION_KEYRING: "" },
    { OMTS_WEB_SESSION_ACTIVE_KEY_ID: "../key", OMTS_WEB_SESSION_KEYRING: `key=${encodedKey()}` },
  ])("rejects missing or malformed configuration %#", (input) => {
    expect(parseServerSessionKeyring(input).status).toBe("invalid-config");
  });

  it.each([
    `key=${encodedKey(1)},key=${encodedKey(2)}`,
    "key=not-base64url",
    `key=${Buffer.alloc(31).toString("base64url")}`,
    `key=${Buffer.alloc(33).toString("base64url")}`,
    `key=${encodedKey()}=suffix`,
    `=${encodedKey()}`,
  ])("rejects an unusable keyring without exposing its material %#", (keyring) => {
    const result = parseServerSessionKeyring({
      OMTS_WEB_SESSION_ACTIVE_KEY_ID: "key",
      OMTS_WEB_SESSION_KEYRING: keyring,
    });
    expect(result).toEqual({
      status: "invalid-config",
      fields: ["OMTS_WEB_SESSION_KEYRING"],
    });
    expect(JSON.stringify(result)).not.toContain(keyring);
  });

  it("requires the active key to exist in the retained keyring", () => {
    expect(parseServerSessionKeyring(environment("future-key"))).toEqual({
      status: "invalid-config",
      fields: [
        "OMTS_WEB_SESSION_ACTIVE_KEY_ID",
        "OMTS_WEB_SESSION_KEYRING",
      ],
    });
  });

  it.each([
    "NEXT_PUBLIC_OMTS_WEB_SESSION_ACTIVE_KEY_ID",
    "NEXT_PUBLIC_OMTS_WEB_SESSION_KEYRING",
  ] as const)("rejects browser-public secret alias %s", (field) => {
    const result = parseServerSessionKeyring({
      ...environment(),
      [field]: "must-not-be-public",
    });
    expect(result).toEqual({ status: "invalid-config", fields: [field] });
  });

  it("caps the retained key count", () => {
    const keyring = Array.from(
      { length: 9 },
      (_, index) => `key-${index}=${encodedKey(index)}`,
    ).join(",");
    expect(
      parseServerSessionKeyring({
        OMTS_WEB_SESSION_ACTIVE_KEY_ID: "key-0",
        OMTS_WEB_SESSION_KEYRING: keyring,
      }).status,
    ).toBe("invalid-config");
  });

  it("snapshots configuration and does not serialize key material", async () => {
    const input = environment();
    const secret = input.OMTS_WEB_SESSION_KEYRING;
    const result = parseServerSessionKeyring(input);
    input.OMTS_WEB_SESSION_KEYRING = `changed=${encodedKey(4)}`;

    expect(result.status).toBe("valid");
    if (result.status !== "valid") throw new Error("Expected a valid keyring");
    await expect(result.provider.active()).resolves.toMatchObject({
      keyId: "key-2026-10",
    });
    expect(JSON.stringify(result)).toBe('{"status":"valid","provider":{}}');
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("redacts hostile configuration getter failures", () => {
    const input = Object.defineProperty({}, "OMTS_WEB_SESSION_KEYRING", {
      get() {
        throw new Error("private-key-material");
      },
    });
    const result = parseServerSessionKeyring(input);
    expect(result).toEqual({ status: "invalid-config", fields: [] });
    expect(JSON.stringify(result)).not.toContain("private-key-material");
  });
});
