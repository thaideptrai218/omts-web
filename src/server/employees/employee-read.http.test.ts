import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createEmployeeReadAdapter } from "./employee-read-adapter";
import { createBackendTransport } from "../backend/backend-transport";
import { withHttpFixture, fixtureEnvironment, readFixtureBody } from "../backend/__tests__/http-fixture";
import { prepareEmployeeReadRequest } from "@/features/employee-management/api/employee-read-request";
import { employeeListItemFixture, workingZoneId } from "@/features/employee-management/api/employee-wire.fixtures";
import { resolver, environment, employeeId, employeeDetailFixture, accessCanary } from "./__tests__/employee-fixture";

function get(path = "/fixture") {
  return new Request(environment.OMTS_WEB_ORIGIN + path, { headers: {
    Cookie: "browser-session-marker", Authorization: "Bearer ignored-browser-token",
  } });
}

describe("employee GET with disposable Node HTTP peers, not .NET", () => {
  it("sends the exact list/detail/picker targets, raw query values and server bearer", async () => {
    const received: Array<{ path: string; method?: string; bearer?: string; cookie?: string; body: string; contentType?: string }> = [];
    const query = { search: "Nguyễn +84900000000 & statusId=402 / %20", statusId: 401, zoneId: workingZoneId, page: 2, pageSize: 20 };
    await withHttpFixture(async (incoming, response) => {
      const url = new URL(incoming.url!, "http://fixture.test");
      received.push({ path: incoming.url!, method: incoming.method, bearer: incoming.headers.authorization,
        cookie: incoming.headers.cookie, body: await readFixtureBody(incoming), contentType: incoming.headers["content-type"] });
      const data = url.pathname.endsWith("linkable-accounts")
        ? [{ ...employeeListItemFixture().account, phoneNumber: null }]
        : url.pathname === "/api/employees"
          ? { items: [employeeListItemFixture()], page: 2, pageSize: 20, total: 21 }
          : employeeDetailFixture();
      response.setHeader("Set-Cookie", "upstream-only=not-for-browser");
      response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(data));
    }, async (origin) => {
      const env = { ...environment, ...fixtureEnvironment(origin) };
      const adapter = createEmployeeReadAdapter(env, { resolve: resolver(), backend: createBackendTransport(env) });
      const prepared = prepareEmployeeReadRequest({ endpoint: "employeeList", query });
      if (prepared.status !== "prepared") throw new Error("Expected GET target");
      const listed = await adapter.list(get(prepared.request.path));
      expect(listed).toMatchObject({ status: "loaded", page: { page: 2, total: 21 } });
      const detail = await adapter.detail(get(), employeeId);
      expect(detail).toMatchObject({ status: "loaded", employee: { id: employeeId, bankAccount: employeeDetailFixture().bankAccount } });
      const accounts = await adapter.linkableAccounts(get());
      expect(accounts).toMatchObject({ status: "loaded", accounts: [{ phone: null }] });
      expect(JSON.stringify([listed, detail, accounts])).not.toMatch(new RegExp(`${accessCanary}|browser-session-marker|upstream-only`));
    });
    expect(received).toHaveLength(3);
    const listUrl = new URL(received[0].path, "http://fixture.test");
    expect(listUrl.pathname).toBe("/api/employees");
    expect(listUrl.searchParams.getAll("search")).toEqual([query.search]);
    expect(listUrl.searchParams.getAll("statusId")).toEqual(["401"]);
    expect(listUrl.searchParams.size).toBe(5);
    expect(received[1].path).toBe(`/api/employees/${employeeId}`);
    expect(received[2].path).toBe("/api/employees/linkable-accounts");
    for (const item of received) expect(item).toMatchObject({ method: "GET", bearer: `Bearer ${accessCanary}`, cookie: undefined, body: "", contentType: undefined });
  });

  it.each([401, 403, 404])("keeps actual HTTP%s failures redacted without retry", async (status) => {
    let hits = 0;
    await withHttpFixture((_req, res) => {
      hits++; res.writeHead(status, { "Content-Type": "application/problem+json" }).end(JSON.stringify({ detail: accessCanary }));
    }, async (origin) => {
      const env = { ...environment, ...fixtureEnvironment(origin) };
      const result = await createEmployeeReadAdapter(env, { resolve: resolver(), backend: createBackendTransport(env) }).detail(get(), employeeId);
      expect(result).toMatchObject({ status: "backend-failure", diagnostic: { httpStatus: status } });
      expect(JSON.stringify(result)).not.toContain(accessCanary);
      expect(result).not.toHaveProperty("employee");
    });
    expect(hits).toBe(1);
  });

  it("rejects actual 204 responses and incorrect 200 payloads instead of inventing empty data", async () => {
    let hits = 0;
    await withHttpFixture((_req, res) => {
      hits++;
      if (hits === 1) { res.writeHead(204).end(); return; }
      const data = hits === 2 ? { items: [], page: 2, pageSize: 20, total: 0 } : { items: [] };
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(data));
    }, async (origin) => {
      const env = { ...environment, ...fixtureEnvironment(origin) };
      const adapter = createEmployeeReadAdapter(env, { resolve: resolver(), backend: createBackendTransport(env) });
      expect(await adapter.detail(get(), employeeId)).toMatchObject({ status: "backend-failure", diagnostic: { outcome: "invalid-response" } });
      expect(await adapter.list(get())).toEqual({ status: "invalid-response" });
      expect(await adapter.linkableAccounts(get())).toEqual({ status: "invalid-response" });
    });
  });

  it("does not follow redirects to a second origin or send the token there", async () => {
    let destinationHits = 0;
    await withHttpFixture((_req, res) => { destinationHits++; res.end("unexpected"); }, async (destination) => {
      await withHttpFixture((_req, res) => { res.writeHead(307, { Location: destination }).end(); }, async (origin) => {
        const env = { ...environment, ...fixtureEnvironment(origin) };
        const result = await createEmployeeReadAdapter(env, { resolve: resolver(), backend: createBackendTransport(env) }).linkableAccounts(get());
        expect(result).toMatchObject({ status: "backend-failure", diagnostic: { outcome: "unavailable" } });
      });
    });
    expect(destinationHits).toBe(0);
  });
});
