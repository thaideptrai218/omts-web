import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createBackendTransport } from "./backend-transport";
import { parseServerAuthTokens } from "./server-auth-tokens";
import { projectProfileDto } from "./browser-dto";
import { projectBackendDiagnostic } from "./backend-diagnostic";
import { fixtureEnvironment, readFixtureBody, withHttpFixture } from "./__tests__/http-fixture";
import { accountId, otherAccountId, profileFixture, secretCanaries, tokenFixture } from "./__tests__/serialization-fixtures";

describe("isolated HTTP -> transport -> server DTO -> JSON seams, no product handler", () => {
  it("keeps login tokens server-side after transport decoding and does not mint a session", async () => {
    await withHttpFixture(async (request, response) => {
      await readFixtureBody(request);
      response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(tokenFixture()));
    }, async (origin) => {
      const result = await createBackendTransport(fixtureEnvironment(origin)).request({
        endpoint: "login", body: { identifier: "fixture.user", password: secretCanaries[2], clientType: "Web" },
      });
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      // The low-level transport still returns internal raw data. A caller must
      // not skip the explicit custody/DTO boundary and serialize it directly.
      expect(JSON.stringify(result)).toContain(secretCanaries[0]);
      const parsed = parseServerAuthTokens(result.data);
      expect(parsed.status).toBe("validated");
      if (parsed.status !== "validated") return;
      expect(() => NextResponse.json(parsed)).toThrow("SERVER_AUTH_TOKENS_NOT_SERIALIZABLE");
      const diagnostic = projectBackendDiagnostic("login", result);
      for (const canary of secretCanaries) expect(JSON.stringify(diagnostic)).not.toContain(canary);
      expect(parsed.credentials.readForSessionStore()).toMatchObject({ mustChangePassword: true, phoneVerificationRequired: true });
    });
  });
  it("projects actual profile JSON without forwarding upstream cookies or additive secrets", async () => {
    await withHttpFixture((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/json", "Set-Cookie": `upstream=${secretCanaries[0]}` })
        .end(JSON.stringify(profileFixture()));
    }, async (origin) => {
      const result = await createBackendTransport(fixtureEnvironment(origin)).request({ endpoint: "profileRead", accessToken: "fake-bearer" });
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      const dto = projectProfileDto(result.data, accountId);
      expect(dto.status).toBe("projected");
      const outgoing = NextResponse.json(dto);
      expect(outgoing.headers.get("set-cookie")).toBeNull();
      const text = await outgoing.text();
      expect(text).toContain("Tên cá nhân fixture");
      for (const canary of secretCanaries) expect(text).not.toContain(canary);
    });
  });
  it.each(["account-mismatch", "invalid-data"])("refuses %s even if upstream returned HTTP200", async (failure) => {
    const payload = failure === "account-mismatch" ? { ...profileFixture(), accountId: otherAccountId } : { accessToken: secretCanaries[0] };
    await withHttpFixture((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(payload));
    }, async (origin) => {
      const result = await createBackendTransport(fixtureEnvironment(origin)).request({ endpoint: "profileRead", accessToken: "fake-bearer" });
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(projectProfileDto(result.data, accountId)).toEqual({ status: failure });
    });
  });
});
