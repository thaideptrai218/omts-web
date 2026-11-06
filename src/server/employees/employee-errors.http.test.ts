import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createEmployeeMutationAdapter } from "./employee-mutation-adapter";
import { createBackendTransport } from "../backend/backend-transport";
import { withHttpFixture, fixtureEnvironment, readFixtureBody } from "../backend/__tests__/http-fixture";
import { resolver, request, environment, employeeId, accessCanary } from "./__tests__/employee-fixture";

describe("employee error DTO through actual loopback HTTP, not .NET", () => {
  it.each([
    [{ code: "MSG01", field: "Phone number", fields: ["Phone number", "Bank account"] }, 400,
      { status: "invalid-fields", code: "MSG01", fields: ["phone", "bankAccount"] }],
    [{ code: "MSG03", existingEmployeeId: employeeId }, 409,
      { status: "duplicate", code: "MSG03", existingEmployeeId: employeeId }],
    [{ code: "MSG24", existingEmployeeId: employeeId }, 409,
      { status: "account-already-linked", code: "MSG24", existingEmployeeId: employeeId }],
  ] as const)("projects only the intended UI-neutral problem case %#", async (body, status, expected) => {
    let hits = 0;
    await withHttpFixture(async (incoming, response) => {
      hits++; await readFixtureBody(incoming);
      response.setHeader("Set-Cookie", "do-not-forward=upstream");
      response.writeHead(status, { "Content-Type": "application/problem+json" }).end(JSON.stringify({
        ...body, detail: accessCanary, hint: accessCanary, stack: accessCanary,
        params: { employee_name: accessCanary }, currentRowVersion: "AAAAAAAA+/8=",
      }));
    }, async (origin) => {
      const env = { ...environment, ...fixtureEnvironment(origin) };
      const adapter = createEmployeeMutationAdapter(env, { resolve: resolver(), backend: createBackendTransport(env) });
      const result = await adapter.mutate(request("PUT"), employeeId);
      expect(result).toEqual(expected);
      expect(JSON.stringify(result)).not.toMatch(new RegExp(`${accessCanary}|do-not-forward|currentRowVersion`));
    });
    expect(hits).toBe(1);
  });

  it.each([
    { code: "MSG03", existingId: employeeId },
    { code: "MSG24", detail: "This account is linked to employee Example Name" },
    { code: "MSG03", existingEmployeeId: "https://other.example.test" },
  ])("blocks unusable identity metadata rather than parsing free text case %#", async (body) => {
    await withHttpFixture(async (incoming, response) => {
      await readFixtureBody(incoming);
      response.writeHead(409, { "Content-Type": "application/problem+json" }).end(JSON.stringify(body));
    }, async (origin) => {
      const env = { ...environment, ...fixtureEnvironment(origin) };
      const result = await createEmployeeMutationAdapter(env, { resolve: resolver(), backend: createBackendTransport(env) })
        .mutate(request("PUT"), employeeId);
      expect(result).toEqual({ status: "contract-blocked", reason: "employee-error-metadata", code: body.code });
    });
  });

  it("handles unlink RowVersion validation without changing the version or sending a retry", async () => {
    let hits = 0;
    await withHttpFixture(async (incoming, response) => {
      hits++; await readFixtureBody(incoming);
      response.writeHead(400, { "Content-Type": "application/problem+json" }).end(JSON.stringify({ code: "MSG01", field: "RowVersion" }));
    }, async (origin) => {
      const env = { ...environment, ...fixtureEnvironment(origin) };
      expect(await createEmployeeMutationAdapter(env, { resolve: resolver(), backend: createBackendTransport(env) }).mutate(request(), employeeId))
        .toEqual({ status: "invalid-fields", code: "MSG01", fields: ["recordVersion"] });
    });
    expect(hits).toBe(1);
  });
});
