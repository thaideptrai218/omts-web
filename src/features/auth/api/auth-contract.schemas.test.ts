import { describe, expect, it } from "vitest";
import {
  authTokensSchema,
  currentIdentitySchema,
  loginRequestSchema,
  refreshRequestSchema,
} from "@/features/auth/api/auth-contract.schemas";

const accountId = "122bb318-a72e-49aa-a8d7-a6169f889007";
const tokens = {
  accessToken: "fixture-access-not-a-real-token",
  accessTokenExpiresAt: "2026-10-24T08:15:00.1234567+00:00",
  refreshToken: "fixture-refresh-not-a-real-token",
  refreshTokenExpiresAt: "2026-10-31T08:00:00Z",
  accountId,
  displayName: "Người dùng kiểm thử",
  subjectType: "Staff",
  mustChangePassword: true,
  phoneVerificationRequired: true,
};

describe("auth wire contract at backend 48ae1e0", () => {
  it("preserves opaque tokens, timestamps and both gate flags", () => {
    expect(authTokensSchema.parse(tokens)).toEqual(tokens);
  });

  it("ignores additive response fields without exposing them", () => {
    expect(authTokensSchema.parse({ ...tokens, futureField: "ignored" })).toEqual(tokens);
  });

  it.each([
    { accessToken: "" }, { refreshToken: "  " }, { accountId: "not-a-guid" },
    { subjectType: "FutureActor" }, { subjectType: 2 },
    { mustChangePassword: undefined }, { phoneVerificationRequired: "false" },
    { accessTokenExpiresAt: "2026-02-30T08:00:00Z" },
    { refreshTokenExpiresAt: "tomorrow" },
  ])("rejects invalid essential fields: %j", (change) => {
    expect(authTokensSchema.safeParse({ ...tokens, ...change }).success).toBe(false);
  });

  it("validates identity separately from the token response", () => {
    const identity = {
      accountId, sessionId: accountId, username: "qa.user", subjectType: "Staff",
    };
    expect(currentIdentitySchema.parse(identity)).toEqual(identity);
    expect(currentIdentitySchema.safeParse({ ...identity, sessionId: null }).success).toBe(false);
    expect(currentIdentitySchema.safeParse(tokens).success).toBe(false);
  });

  it("keeps a password unchanged and requires the Web client type", () => {
    const request = { identifier: "qa.user", password: " fixture-only ", clientType: "Web" };
    expect(loginRequestSchema.parse(request).password).toBe(" fixture-only ");
    expect(loginRequestSchema.safeParse({ ...request, clientType: "Mobile" }).success).toBe(false);
    expect(loginRequestSchema.safeParse({ ...request, extra: true }).success).toBe(false);
  });

  it("bounds request sizes without changing form validation or enabling refresh", () => {
    const request = { identifier: "x".repeat(254), password: "x".repeat(128), clientType: "Web" };
    expect(loginRequestSchema.safeParse(request).success).toBe(true);
    expect(loginRequestSchema.safeParse({ ...request, identifier: "x".repeat(255) }).success).toBe(false);
    expect(loginRequestSchema.safeParse({ ...request, password: "x".repeat(129) }).success).toBe(false);
    expect(refreshRequestSchema.safeParse({ refreshToken: "x".repeat(512) }).success).toBe(true);
    expect(refreshRequestSchema.safeParse({ refreshToken: "x".repeat(513) }).success).toBe(false);
  });
});
