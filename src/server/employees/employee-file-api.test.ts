import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("./../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved } from "./__tests__/employee-fixture";
import { planEmployeeApi, planEmployeeImport } from "./employee-api-plan";
import { handleEmployeeApi } from "./employee-api-http";

const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const id1 = "122bb318-a72e-49aa-a8d7-a6169f889007", id2 = "b669dc43-c9dc-4df8-930b-ab9de6d978e3";
function configure(subjectType = "CooperativeOwner") {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000"); vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.mode = "api"; gateway.resolve.mockResolvedValue(resolved()); gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType }, permissions: { functionPermissions: [] } } });
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
const get = (query: string) => new Request(`http://localhost:3002/api/operations/employees?${query}`);
const workbook = (name = 'attachment; filename="employees-20261111.xlsx"') => new Response(new Uint8Array([0x50, 0x4b, 3, 4, 9]), { headers: { "content-type": mime, "content-disposition": name } });
const zip = (size = 16) => { const bytes = new Uint8Array(size); bytes[0] = 0x50; bytes[1] = 0x4b; return bytes; };
function upload(parts: [string, Blob | string, string?][] = [["file", new Blob([zip()], { type: mime }), "nhan-vien.xlsx"]], query = "action=import", origin = "http://localhost:3002") {
  const form = new FormData();
  for (const [key, value, name] of parts) { if (typeof value === "string") form.append(key, value); else form.append(key, value, name); }
  return new Request(`http://localhost:3002/api/operations/employees?${query}`, { method: "POST", headers: { Origin: origin, "X-OMTS-Request": "web" }, body: form });
}

describe("employee list, export and import plans", () => {
  it("forwards the new list filters and sort in the backend query", () => {
    const plan = planEmployeeApi("GET", new URLSearchParams(`action=list&employeeType=Staff&jobTypeId=${id1}&sortBy=lastWorkingDay&sortDir=desc&statusId=401`));
    expect(plan?.path).toContain("employeeType=Staff"); expect(plan?.path).toContain(`jobTypeId=${id1}`); expect(plan?.path).toContain("sortBy=lastWorkingDay"); expect(plan?.path).toContain("sortDir=desc");
  });
  it.each(["action=list&employeeType=Boss", "action=list&jobTypeId=nope", "action=list&sortBy=password", "action=list&sortDir=up", `action=list&ids=${id1}`, "action=list&sortBy=name&sortBy=code"])("rejects list query %s", query => {
    expect(planEmployeeApi("GET", new URLSearchParams(query))).toBeUndefined();
  });
  it("plans an export with filters and sort but no paging, and the template with no parameters", () => {
    const plan = planEmployeeApi("GET", new URLSearchParams(`action=export&search=an&statusId=401&employeeType=SeasonalWorker&sortBy=code&sortDir=asc`));
    expect(plan).toMatchObject({ file: "export", method: "GET" });
    expect(new URL(plan!.path, "http://x").pathname).toBe("/api/employees/export");
    expect(new URL(plan!.path, "http://x").searchParams.get("employeeType")).toBe("SeasonalWorker");
    expect(planEmployeeApi("GET", new URLSearchParams("action=import-template"))).toMatchObject({ file: "template", path: "/api/employees/import/template" });
    expect(planEmployeeApi("GET", new URLSearchParams("action=import-template&x=1"))).toBeUndefined();
  });
  it("lets only ids repeat, caps them at 200, and does not mix them with filters", () => {
    expect(planEmployeeApi("GET", new URLSearchParams(`action=export&ids=${id1}&ids=${id2}&sortBy=name`))?.path).toBe(`/api/employees/export?sortBy=name&ids=${id1}&ids=${id2}`);
    const many = Array.from({ length: 201 }, () => crypto.randomUUID()).map(value => `ids=${value}`).join("&");
    expect(planEmployeeApi("GET", new URLSearchParams(`action=export&${many}`))).toBeUndefined();
    const exactly = Array.from({ length: 200 }, () => crypto.randomUUID()).map(value => `ids=${value}`).join("&");
    expect(planEmployeeApi("GET", new URLSearchParams(`action=export&${exactly}`))).toMatchObject({ file: "export" });
    for (const bad of [`ids=${id1}&ids=${id1}`, `ids=${id1}&search=an`, "ids=nope", "search=a&search=b", "page=1", "pageSize=15", "evil=1"]) expect(planEmployeeApi("GET", new URLSearchParams(`action=export&${bad}`))).toBeUndefined();
  });
  it("plans the import only for exactly action=import", () => {
    expect(planEmployeeImport(new URLSearchParams("action=import"))).toMatchObject({ file: "import", method: "POST", path: "/api/employees/import" });
    expect(planEmployeeImport(new URLSearchParams("action=import&x=1"))).toBeUndefined();
    expect(planEmployeeImport(new URLSearchParams("action=list"))).toBeUndefined();
  });
  it("accepts the new profile fields on create and update, strictly", () => {
    const body = { fullName: "An", workingZoneIds: [id1], employeeType: "Staff", code: "nv-01", gender: "Female", idNumber: "012345678901", startDate: "2025-03-01" };
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "create", body })).toMatchObject({ body: { code: "nv-01", gender: "Female", idNumber: "012345678901" } });
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "update", id: id1, body: { ...body, rowVersion: "AQID", idNumber: "" } })).toMatchObject({ method: "PUT" });
    for (const bad of [{ code: "bad code" }, { code: "A".repeat(21) }, { gender: "Robot" }, { idNumber: "12345" }, { startDate: "2999-01-01" }, { email: "a@example.test" }]) {
      expect(planEmployeeApi("POST", new URLSearchParams(), { action: "create", body: { ...body, ...bad } })).toBeUndefined();
    }
  });
});

describe("employee export and template (BFF)", () => {
  it("streams the workbook with the backend name, no-store and the workbook type", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(workbook());
    const response = await handleEmployeeApi(get("action=export&statusId=401&sortBy=name&sortDir=asc"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(mime);
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="employees-20261111.xlsx"');
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([0x50, 0x4b, 3, 4, 9]));
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe("http://127.0.0.1:8080/api/employees/export?statusId=401&sortBy=name&sortDir=asc");
    expect((init!.headers as Record<string, string>).Accept).toBe(mime);
  });
  it("falls back to a dated name when the backend name is not plain, and rejects a non-workbook answer", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(workbook("attachment; filename=\"../../x.exe\"")).mockResolvedValueOnce(new Response("<html>", { headers: { "content-type": "text/html" } }));
    const named = await handleEmployeeApi(get(`action=export&ids=${id1}`));
    expect(named.headers.get("content-disposition")).toMatch(/^attachment; filename="employees-\d{8}\.xlsx"$/);
    expect((await handleEmployeeApi(get("action=export"))).status).toBe(502);
  });
  it("serves the import template under its own name", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(workbook(""));
    const response = await handleEmployeeApi(get("action=import-template"));
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="employees-import-template.xlsx"');
    expect(String(fetcher.mock.calls[0][0])).toBe("http://127.0.0.1:8080/api/employees/import/template");
  });
  it("passes a backend refusal (for example above 5000 rows) as a safe code, never the file path", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ title: "MSG-GEN-01", status: 400, detail: "At most 5000 employees: narrow the filter.", code: "MSG-GEN-01", legacyCode: "MSG01", field: "Filter" }, { status: 400 }));
    const response = await handleEmployeeApi(get("action=export")), result = await response.json();
    expect(response.status).toBe(400); expect(result).toEqual({ status: "rejected", code: "MSG-GEN-01" });
  });
  it.each(["Staff", "Trader", "SystemAdministrator"])("refuses export and template for %s before the backend", async subject => {
    configure(subject); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleEmployeeApi(get("action=export"))).status).toBe(403);
    expect((await handleEmployeeApi(get("action=import-template"))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects invalid input before the session is read, and an expired or changed session", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleEmployeeApi(get("action=export&sortBy=secret"))).status).toBe(400);
    expect(gateway.resolve).not.toHaveBeenCalled();
    gateway.resolve.mockResolvedValueOnce({ status: "missing" });
    expect((await handleEmployeeApi(get("action=export"))).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("drops the file when the session changed while it was built", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(workbook());
    gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved({ identity: { ...resolved().session.identity, backendSessionId: id2 } }));
    const response = await handleEmployeeApi(get("action=export"));
    expect(response.status).toBe(401); expect(response.headers.get("content-type")).not.toBe(mime);
  });
});

describe("employee import (BFF)", () => {
  const ok = { imported: 2, errors: [{ row: 4, fields: ["Phone number"], message: "Repeated in this file.", messageCode: null }] };
  it("forwards the workbook as multipart under a fixed name and returns the strict result", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(ok));
    const response = await handleEmployeeApi(upload());
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ status: "success", data: ok });
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe("http://127.0.0.1:8080/api/employees/import"); expect(init!.method).toBe("POST");
    const sent = init!.body as FormData, file = sent.get("file") as File;
    expect([...sent.keys()]).toEqual(["file"]); expect(file.name).toBe("employees-import.xlsx"); expect(file.size).toBe(16);
    expect((init!.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });
  it("checks origin and the web header before reading the body", async () => {
    configure(); const request = upload(undefined, "action=import", "https://evil.test"), reader = vi.spyOn(request.body!, "getReader"), fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleEmployeeApi(request)).status).toBe(403); expect(reader).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    ["a name that is not .xlsx", [["file", new Blob([zip()]), "nhan-vien.csv"]]],
    ["a file that is not a zip container", [["file", new Blob([new Uint8Array(16)]), "a.xlsx"]]],
    ["more than 2 MB", [["file", new Blob([zip(2 * 1024 * 1024 + 1)]), "a.xlsx"]]],
    ["an extra part", [["file", new Blob([zip()]), "a.xlsx"], ["note", "x"]]],
    ["no file part", [["note", "x"]]],
    ["a text value instead of a file", [["file", "PK"]]],
  ] as [string, [string, Blob | string, string?][]][])("rejects %s without calling the backend", async (_name, parts) => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    const response = await handleEmployeeApi(upload(parts));
    expect(response.status).toBe(400); expect(await response.json()).toEqual({ status: "invalid-input", code: "MSG01" }); expect(fetcher).not.toHaveBeenCalled();
  });
  it("accepts exactly 2 MB and refuses a wrong query or a non-owner before the backend", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ imported: 0, errors: [] }));
    expect((await handleEmployeeApi(upload([["file", new Blob([zip(2 * 1024 * 1024)]), "a.xlsx"]]))).status).toBe(200);
    expect((await handleEmployeeApi(upload(undefined, "action=import&x=1"))).status).toBe(400);
    expect((await handleEmployeeApi(upload(undefined, "action=list"))).status).toBe(400);
    configure("Staff"); fetcher.mockClear();
    expect((await handleEmployeeApi(upload())).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects an answer that does not match the strict result, and keeps backend refusals safe", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ ...ok, extra: "x" }))
      .mockResolvedValueOnce(Response.json({ imported: -1, errors: [] }))
      .mockResolvedValueOnce(Response.json({ title: "MSG-GEN-01", status: 400, detail: "The file has no rows.", code: "MSG-GEN-01", field: "File" }, { status: 400 }))
      .mockResolvedValueOnce(Response.json({ title: "MSG-GEN-02", status: 409, detail: "private", code: "MSG-GEN-02" }, { status: 409 }));
    expect((await handleEmployeeApi(upload())).status).toBe(502);
    expect((await handleEmployeeApi(upload())).status).toBe(502);
    const refused = await handleEmployeeApi(upload());
    expect(refused.status).toBe(400); expect(await refused.json()).toEqual({ status: "rejected", code: "MSG-GEN-01" });
    const conflict = await handleEmployeeApi(upload());
    expect(conflict.status).toBe(409); expect(JSON.stringify(await conflict.json())).not.toContain("private");
  });
  it("never echoes the file name or contents in a response", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(ok));
    const text = await (await handleEmployeeApi(upload([["file", new Blob([zip()]), "bi-mat-luong.xlsx"]]))).text();
    expect(text).not.toContain("bi-mat-luong");
  });
});
