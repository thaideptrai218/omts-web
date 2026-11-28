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
const salary = { employeeId: id, employeeType: "Staff", current: { type: "FixedMonthly", monthlyAmount: 9_000_000, payFieldShifts: true, effectiveFrom: "2026-11-01", enteredAt: "2026-11-01T01:00:00+00:00" }, currentType: "FixedMonthly", history: [], rowVersion: "AQID" };
const signed = "/api/files/local/employee-photos/2026/11/a.png?expires=1795781504&sig=abc";
const view = () => ({ ...employeeDetailFixture(), id, photoUrl: signed });

describe("employee photo and salary plans", () => {
  it("plans the salary read and save, and a body-less photo removal", () => {
    expect(planEmployeeApi("GET", new URLSearchParams(`action=salary&id=${id}`))).toMatchObject({ path: `/api/employees/${id}/salary`, method: "GET", payRule: "View" });
    const body = { type: "FixedMonthly", monthlyAmount: 9_000_000, effectiveFrom: "2026-11-01", rowVersion: "AQID" };
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "save-salary", id, body })).toMatchObject({ path: `/api/employees/${id}/salary`, method: "POST", payRule: "Edit", body });
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "remove-photo", id, body: {} })).toMatchObject({ path: `/api/employees/${id}/photo`, method: "DELETE" });
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "remove-photo", id, body: { x: 1 } })).toBeUndefined();
  });
  it.each([{ type: "Hourly", monthlyAmount: 1000 }, { type: "PerShift", monthlyAmount: 1000 }, { type: "PerShift", payFieldShifts: true }, { type: "Hourly", payFieldShifts: false }, { type: "FixedMonthly" }, { type: "FixedMonthly", monthlyAmount: 1.5 }, { type: "FixedMonthly", monthlyAmount: 0 }, { type: "Daily" }])("rejects the salary body %j", fields => {
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "save-salary", id, body: { effectiveFrom: "2026-11-01", rowVersion: "AQID", ...fields } })).toBeUndefined();
  });
  it("accepts a fixed salary with or without field-shift pay, and a per-shift setup with no amount", () => {
    const save = (fields: object) => planEmployeeApi("POST", new URLSearchParams(), { action: "save-salary", id, body: { effectiveFrom: "2026-11-01", rowVersion: "AQID", ...fields } });
    expect(save({ type: "FixedMonthly", monthlyAmount: 8_000_000, payFieldShifts: false })).toMatchObject({ body: { type: "FixedMonthly", monthlyAmount: 8_000_000, payFieldShifts: false } });
    expect(save({ type: "FixedMonthly", monthlyAmount: 8_000_000 })).toBeTruthy();
    expect(save({ type: "PerShift" })).toBeTruthy();
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
    expect(response.status).toBe(200); expect((await response.json()).data.photoUrl).toMatch(/^\/api\/operations\/employees\?action=photo&id=.+&v=[0-9a-f]{10}$/);
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

describe("employee photo through the BFF", () => {
  it("rewrites every photo address of a list page to the BFF address and never lets a signed address out", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ items: [{ ...view(), photoUrl: signed }, { ...view(), id: "b669dc43-c9dc-4df8-930b-ab9de6d978e3", photoUrl: null }], page: 1, pageSize: 10, total: 2 }));
    const text = await (await handleEmployeeApi(get("action=list"))).text(), items = JSON.parse(text).data.items;
    expect(items[0].photoUrl).toMatch(/^\/api\/operations\/employees\?action=photo&id=122bb318-[0-9a-f-]+&v=[0-9a-f]{10}$/); expect(items[1].photoUrl).toBeNull();
    expect(text).not.toContain("sig=abc");
  });
  it("serves the stored image of an employee the caller may see, inline and sandboxed, and nothing else", async () => {
    configure("Staff", [{ functionCode: "LABOR_WORKERS", action: "View" }]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async input => String(input).includes("/api/files/local/") ? new Response(png(), { headers: { "content-type": "image/png" } }) : Response.json(view()));
    const response = await handleEmployeeApi(get(`action=photo&id=${id}&v=0123456789`));
    expect(response.status).toBe(200); expect(response.headers.get("content-type")).toBe("image/png"); expect(response.headers.get("content-security-policy")).toContain("sandbox");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(png());
    expect(String(fetcher.mock.calls[1][0])).toBe(`http://127.0.0.1:8080${signed}`);
    fetcher.mockImplementation(async input => String(input).includes("/api/files/local/") ? new Response("<html>", { headers: { "content-type": "text/html" } }) : Response.json(view()));
    expect((await handleEmployeeApi(get(`action=photo&id=${id}`))).status).toBe(503);
    fetcher.mockImplementation(async () => Response.json({ ...view(), photoUrl: "https://evil.test/x.png" }));
    expect((await handleEmployeeApi(get(`action=photo&id=${id}`))).status).toBe(404);
    expect((await handleEmployeeApi(get(`action=photo&id=${id}&v=bad`))).status).toBe(400);
  });
});
