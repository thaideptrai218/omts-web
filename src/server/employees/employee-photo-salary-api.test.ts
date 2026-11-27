import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("./../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved } from "./__tests__/employee-fixture";
import { employeeDetailFixture } from "@/features/employee-management/api/employee-wire.fixtures";
import { planEmployeeApi, planEmployeePhoto } from "./employee-api-plan";
import { handleEmployeeApi } from "./employee-api-http";

const id = "122bb318-a72e-49aa-a8d7-a6169f889007";
function configure(subjectType = "CooperativeOwner", functionPermissions: { functionCode: string; action: string }[] = []) {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000"); vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.mode = "api"; gateway.resolve.mockResolvedValue(resolved()); gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType }, permissions: { functionPermissions } } });
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
const get = (query: string) => new Request(`http://localhost:3002/api/operations/employees?${query}`);
const post = (action: string, body?: unknown) => new Request("http://localhost:3002/api/operations/employees", { method: "POST", headers: { Origin: "http://localhost:3002", "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: JSON.stringify({ action, id, body }) });
const upload = (bytes: Uint8Array, query = `action=photo&id=${id}`) => {
  const form = new FormData(); form.append("file", new Blob([bytes as BlobPart], { type: "image/png" }), "../evil.png");
  return new Request(`http://localhost:3002/api/operations/employees?${query}`, { method: "POST", headers: { Origin: "http://localhost:3002", "X-OMTS-Request": "web" }, body: form });
};
const png = () => { const bytes = new Uint8Array(32); bytes.set([0x89, 0x50, 0x4e, 0x47]); return bytes; };
const salary = { employeeId: id, employeeType: "Staff", current: { type: "FixedMonthly", monthlyAmount: 9_000_000, effectiveFrom: "2026-11-01", enteredAt: "2026-11-01T01:00:00+00:00" }, currentType: "FixedMonthly", history: [], rowVersion: "AQID" };
const view = () => ({ ...employeeDetailFixture(), id, photoUrl: "/api/files/local/employee-photos/a.png" });

describe("employee photo and salary plans", () => {
  it("plans the salary read and save, and a body-less photo removal", () => {
    expect(planEmployeeApi("GET", new URLSearchParams(`action=salary&id=${id}`))).toMatchObject({ path: `/api/employees/${id}/salary`, method: "GET", payRule: "View" });
    const body = { type: "FixedMonthly", monthlyAmount: 9_000_000, effectiveFrom: "2026-11-01", rowVersion: "AQID" };
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "save-salary", id, body })).toMatchObject({ path: `/api/employees/${id}/salary`, method: "POST", payRule: "Edit", body });
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "remove-photo", id, body: {} })).toMatchObject({ path: `/api/employees/${id}/photo`, method: "DELETE" });
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "remove-photo", id, body: { x: 1 } })).toBeUndefined();
  });
  it.each([{ type: "Hourly", monthlyAmount: 1000 }, { type: "FixedMonthly" }, { type: "FixedMonthly", monthlyAmount: 1.5 }, { type: "FixedMonthly", monthlyAmount: 0 }, { type: "Daily" }])("rejects the salary body %j", fields => {
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "save-salary", id, body: { effectiveFrom: "2026-11-01", rowVersion: "AQID", ...fields } })).toBeUndefined();
  });
  it("accepts an hourly setup with no amount, and plans the photo upload for exactly action and id", () => {
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "save-salary", id, body: { type: "Hourly", effectiveFrom: "2026-11-01", rowVersion: "AQID" } })).toBeTruthy();
    expect(planEmployeePhoto(new URLSearchParams(`action=photo&id=${id}`))).toMatchObject({ file: "photo", method: "PUT", path: `/api/employees/${id}/photo` });
    expect(planEmployeePhoto(new URLSearchParams(`action=photo&id=${id}&x=1`))).toBeUndefined();
    expect(planEmployeePhoto(new URLSearchParams("action=photo&id=nope"))).toBeUndefined();
  });
});

describe("employee photo upload (BFF)", () => {
  it("forwards a PNG under a fixed name as a PUT and returns the bare employee", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(view()));
    const response = await handleEmployeeApi(upload(png()));
    expect(response.status).toBe(200); expect((await response.json()).data.photoUrl).toContain("employee-photos");
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe(`http://127.0.0.1:8080/api/employees/${id}/photo`); expect(init!.method).toBe("PUT");
    expect(((init!.body as FormData).get("file") as File).name).toBe("photo.png");
  });
  it("refuses bytes that are not a JPEG or PNG, and a foreign origin, before the backend", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleEmployeeApi(upload(new Uint8Array(32)))).status).toBe(400);
    expect((await handleEmployeeApi(upload(png(), "action=photo"))).status).toBe(400);
    const foreign = upload(png()); const hostile = new Request(foreign.url, { method: "POST", headers: { Origin: "https://evil.test", "X-OMTS-Request": "web" }, body: await foreign.formData() });
    expect((await handleEmployeeApi(hostile)).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("removes the photo with a DELETE", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...view(), photoUrl: null }));
    expect((await handleEmployeeApi(post("remove-photo", {}))).status).toBe(200);
    expect(fetcher.mock.calls[0][1]!.method).toBe("DELETE");
  });
  it("leaves photo changes to the Owner", async () => {
    configure("Staff", [{ functionCode: "LABOR_WORKERS", action: "Edit" }]); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleEmployeeApi(upload(png()))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("employee salary setup (BFF)", () => {
  it("returns the salary view of the requested employee", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(salary));
    const response = await handleEmployeeApi(get(`action=salary&id=${id}`));
    expect(response.status).toBe(200); expect((await response.json()).data).toMatchObject({ employeeId: id, currentType: "FixedMonthly" });
  });
  it("rejects an answer about another employee", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...salary, employeeId: "b669dc43-c9dc-4df8-930b-ab9de6d978e3" }));
    expect((await handleEmployeeApi(get(`action=salary&id=${id}`))).status).toBe(502);
  });
  it("lets the Accountant read with PAY_RULES View but not save without Edit, and shuts out anyone without PAY_RULES", async () => {
    const body = { type: "Hourly", effectiveFrom: "2026-11-01", rowVersion: "AQID" };
    configure("Staff", [{ functionCode: "PAY_RULES", action: "View" }]); const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json(salary));
    expect((await handleEmployeeApi(get(`action=salary&id=${id}`))).status).toBe(200);
    expect((await handleEmployeeApi(post("save-salary", body))).status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(1);
    configure("Staff", [{ functionCode: "LABOR_WORKERS", action: "View" }]);
    expect((await handleEmployeeApi(get(`action=salary&id=${id}`))).status).toBe(403);
    configure("Staff", [{ functionCode: "PAY_RULES", action: "Edit" }]);
    expect((await handleEmployeeApi(post("save-salary", body))).status).toBe(200);
  });
  it("passes the date and period of a finalized-payroll refusal so the message can be filled", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: "MSG-LABOR-04", parameters: { date: "2026-10-05", period: "10/2026", locked_until: "2026-10-31" }, secret: "x" }, { status: 409 }));
    const response = await handleEmployeeApi(post("save-salary", { type: "Hourly", effectiveFrom: "2026-10-05", rowVersion: "AQID" }));
    const result = await response.json();
    expect(response.status).toBe(409); expect(result).toMatchObject({ status: "rejected", code: "MSG-LABOR-04", hrProblem: { parameters: { period: "10/2026" } } });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
