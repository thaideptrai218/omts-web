import { inspect } from "node:util";
import { Console } from "node:console";
import { Writable } from "node:stream";
import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseServerAuthTokens } from "./server-auth-tokens";
import { secretCanaries, tokenFixture } from "./__tests__/serialization-fixtures";

function credentials() {
  const result = parseServerAuthTokens(tokenFixture());
  if (result.status !== "validated") throw new Error("Expected test credentials");
  return result.credentials;
}

describe("server token custody, not a public login response or session", () => {
  it("validates and snapshots wire data without additive fields or changing gates", () => {
    const input = tokenFixture();
    const result = parseServerAuthTokens(input);
    input.accessToken = "changed";
    expect(result.status).toBe("validated");
    if (result.status !== "validated") return;
    const raw = result.credentials.readForSessionStore();
    expect(raw.accessToken).toBe(secretCanaries[0]);
    expect(raw.mustChangePassword).toBe(true);
    expect(raw.phoneVerificationRequired).toBe(true);
    expect(raw).not.toHaveProperty("password");
    expect(raw).not.toHaveProperty("nested");
    expect(Object.isFrozen(raw)).toBe(true);
  });
  it.each(["CooperativeOwner", "Staff", "Trader", "SystemAdministrator"])("retains actor %s without selecting a flow", (subjectType) => {
    const result = parseServerAuthTokens({ ...tokenFixture(), subjectType });
    expect(result.status).toBe("validated");
    if (result.status === "validated") expect(result.credentials.readForSessionStore().subjectType).toBe(subjectType);
  });
  it.each([
    { accessToken: "" }, { refreshToken: null }, { accountId: "invalid" }, { subjectType: "FutureActor" },
    { mustChangePassword: undefined }, { phoneVerificationRequired: "false" }, { accessTokenExpiresAt: "tomorrow" },
  ])("rejects invalid wire case %# without an issue/cause payload", (change) => {
    expect(parseServerAuthTokens({ ...tokenFixture(), ...change })).toEqual({ status: "invalid-data" });
  });
  it.each(["direct", "wrapped", "Response", "NextResponse"])("blocks accidental %s JSON serialization", (mode) => {
    const value = credentials();
    const serialize = () => {
      if (mode === "Response") return Response.json({ credentials: value });
      if (mode === "NextResponse") return NextResponse.json({ credentials: value });
      return JSON.stringify(mode === "direct" ? value : { credentials: value });
    };
    expect(serialize).toThrow("SERVER_AUTH_TOKENS_NOT_SERIALIZABLE");
    try { serialize(); } catch (error) {
      for (const secret of secretCanaries) expect(inspect(error)).not.toContain(secret);
    }
  });
  it("does not expose tokens through spread, cloning, hidden inspection or string coercion", () => {
    const value = credentials();
    expect(Object.keys(value)).toEqual([]);
    expect({ ...value }).toEqual({});
    expect(structuredClone(value)).toEqual({});
    const observations = [inspect(value), inspect(value, { customInspect: false, showHidden: true }), String(value)];
    for (const output of observations) for (const secret of secretCanaries) expect(output).not.toContain(secret);
  });
  it("redacts ordinary Console logging without selecting a production logger", () => {
    let output = "";
    const sink = new Writable({ write(chunk, _encoding, done) { output += String(chunk); done(); } });
    const logger = new Console({ stdout: sink, stderr: sink });
    const value = credentials();
    logger.log(value); logger.error({ credentials: value }); logger.log("%s", value);
    expect(output).toContain("REDACTED");
    for (const secret of [...secretCanaries, tokenFixture().displayName, tokenFixture().accountId]) expect(output).not.toContain(secret);
    sink.end();
  });
  it("redacts throwing input instead of propagating a secret-bearing exception", () => {
    expect(parseServerAuthTokens({ get accessToken() { throw new Error(secretCanaries[0]); } }))
      .toEqual({ status: "invalid-data" });
  });
});
