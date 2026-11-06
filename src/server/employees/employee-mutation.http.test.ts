import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createEmployeeMutationAdapter } from "./employee-mutation-adapter";
import { createBackendTransport } from "../backend/backend-transport";
import { withHttpFixture, readFixtureBody, fixtureEnvironment } from "../backend/__tests__/http-fixture";
import { employeeRecordToEditorValues, mapEmployeeUpdate } from "@/features/employee-management/api/map-employee-update";
import { accessCanary, employeeDetailFixture, employeeId, environment, request, resolver } from "./__tests__/employee-fixture";

describe("employee BFF adapter with disposable loopback HTTP peers, not .NET", () => {
  it("sends DELETE then PUT with raw decoded/new versions, draft and private bearer", async () => {
    const received: Array<{ method?: string; path?: string; version: string | null; body: string;
      cookie?: string; bearer?: string; contentType?: string }> = [];
    await withHttpFixture(async (incoming, response) => {
      const body = await readFixtureBody(incoming);
      const url = new URL(incoming.url!, "http://fixture.test");
      received.push({ method: incoming.method, path: incoming.url, version: url.searchParams.get("rowVersion"),
        body, cookie: incoming.headers.cookie, bearer: incoming.headers.authorization, contentType: incoming.headers["content-type"] });
      response.setHeader("Set-Cookie", "upstream-only=do-not-forward");
      response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({
        employee: { ...employeeDetailFixture(), account: null,
          fullName: incoming.method === "PUT" ? JSON.parse(body).fullName : employeeDetailFixture().fullName,
          rowVersion: incoming.method === "PUT" ? "AAAAAAAC+/8=" : "AAAAAAAB+/8=" },
        message: "Saved upstream", temporaryPassword: crypto.randomUUID(),
      }));
    }, async (origin) => {
      const env = { ...environment, ...fixtureEnvironment(origin) };
      const adapter = createEmployeeMutationAdapter(env, { resolve: resolver(), backend: createBackendTransport(env) });
      const unlinked = await adapter.mutate(request("DELETE", { headers: { Cookie: "browser-session-marker", Authorization: "Bearer browser-only" } }), employeeId);
      if (unlinked.status !== "saved") throw new Error("Expected saved unlink");
      expect(unlinked.employee.recordVersion).toBe("AAAAAAAB+/8=");
      const mapped = mapEmployeeUpdate(unlinked.employee, { ...employeeRecordToEditorValues(unlinked.employee), fullName: "Tên đang nhập" });
      if (mapped.status !== "ready") throw new Error("Expected draft mapping");
      const saved = await adapter.mutate(request("PUT", { body: JSON.stringify(mapped.request) }), employeeId);
      expect(saved).toMatchObject({ status: "saved", employee: { fullName: "Tên đang nhập", recordVersion: "AAAAAAAC+/8=" } });
      expect(JSON.stringify(saved)).not.toMatch(new RegExp(`${accessCanary}|upstream-only|temporaryPassword|Saved upstream`));
    });
    expect(received).toHaveLength(2);
    expect(received[0]).toEqual({ method: "DELETE", path: `/api/employees/${employeeId}/account?rowVersion=AAAAAAAA%2B%2F8%3D`,
      version: "AAAAAAAA+/8=", body: "", cookie: undefined, bearer: `Bearer ${accessCanary}`, contentType: undefined });
    expect(received[1]).toMatchObject({ method: "PUT", path: `/api/employees/${employeeId}`, version: null, cookie: undefined,
      bearer: `Bearer ${accessCanary}`, contentType: "application/json" });
    expect(JSON.parse(received[1].body)).toMatchObject({ fullName: "Tên đang nhập", rowVersion: "AAAAAAAB+/8=",
      accountId: null, bankAccount: employeeDetailFixture().bankAccount,
      workingZoneIds: employeeDetailFixture().workingZones.map((zone) => zone.id) });
  });

  it("keeps MSG06 blocked and strips upstream detail without retrying", async () => {
    let calls = 0;
    await withHttpFixture((_request, response) => {
      calls++; response.writeHead(409, { "Content-Type": "application/problem+json" }).end(JSON.stringify({
        code: "MSG06", detail: accessCanary, currentRowVersion: "AAAAAAAB+/8=",
      }));
    }, async (origin) => {
      const env = { ...environment, ...fixtureEnvironment(origin) };
      const adapter = createEmployeeMutationAdapter(env, { resolve: resolver(), backend: createBackendTransport(env) });
      expect(await adapter.mutate(request(), employeeId)).toEqual({ status: "contract-blocked", reason: "conflict-metadata", code: "MSG06" });
    });
    expect(calls).toBe(1);
  });

  it("never follows a redirect or leaks bearer to its destination", async () => {
    let sourceHits = 0; let destinationHits = 0;
    await withHttpFixture((_req, res) => { destinationHits++; res.end("unexpected"); }, async (destination) => {
      await withHttpFixture((_req, res) => { sourceHits++; res.writeHead(307, { Location: destination }).end(); }, async (origin) => {
        const env = { ...environment, ...fixtureEnvironment(origin) };
        const result = await createEmployeeMutationAdapter(env, { resolve: resolver(), backend: createBackendTransport(env) }).mutate(request(), employeeId);
        expect(result).toMatchObject({ status: "backend-failure", diagnostic: { outcome: "unavailable" } });
        expect(JSON.stringify(result)).not.toContain(destination);
      });
    });
    expect(sourceHits).toBe(1); expect(destinationHits).toBe(0);
  });

  it("rejects actual empty 204 success instead of claiming that unlink was saved", async () => {
    await withHttpFixture((_req, res) => { res.writeHead(204).end(); }, async (origin) => {
      const env = { ...environment, ...fixtureEnvironment(origin) };
      expect(await createEmployeeMutationAdapter(env, { resolve: resolver(), backend: createBackendTransport(env) }).mutate(request(), employeeId))
        .toMatchObject({ status: "backend-failure", diagnostic: { outcome: "invalid-response" } });
    });
  });
});
