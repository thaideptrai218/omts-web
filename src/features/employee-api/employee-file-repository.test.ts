// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { employeeFileRepository } from "./employee-file-repository";

const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const fetchMock = vi.fn();
const click = vi.fn();
beforeEach(() => {
  fetchMock.mockReset(); click.mockReset(); vi.stubGlobal("fetch", fetchMock);
  URL.createObjectURL = vi.fn(() => "blob:x"); URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const sheet = (disposition = 'attachment; filename="employees-20261111.xlsx"') => new Response(new Uint8Array([0x50, 0x4b]), { headers: { "content-type": mime, "content-disposition": disposition } });

describe("employee file repository", () => {
  it("exports with the same filters and order, leaving empty values out, and saves under the BFF file name", async () => {
    fetchMock.mockResolvedValue(sheet());
    const names: string[] = [];
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => { const element = Document.prototype.createElement.call(document, tag); if (tag === "a") Object.defineProperty(element, "download", { set: (value: string) => names.push(value), get: () => names.at(-1) ?? "" }); return element; }) as typeof document.createElement);
    const result = await employeeFileRepository.exportFile({ search: "an", statusId: "401", zoneId: "", employeeType: "Staff", jobTypeId: undefined, sortBy: "code", sortDir: "desc" });
    expect(result).toEqual({ status: "success", data: true });
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/operations/employees?action=export&search=an&statusId=401&employeeType=Staff&sortBy=code&sortDir=desc");
    expect(names).toEqual(["employees-20261111.xlsx"]); expect(click).toHaveBeenCalledTimes(1);
  });
  it("repeats ids for a selection export", async () => {
    fetchMock.mockResolvedValue(sheet());
    await employeeFileRepository.exportFile({ sortBy: "name", sortDir: "asc" }, ["a1", "b2"]);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/operations/employees?action=export&sortBy=name&sortDir=asc&ids=a1&ids=b2");
  });
  it("downloads the template and refuses an answer that is not a workbook", async () => {
    fetchMock.mockResolvedValueOnce(sheet('attachment; filename="employees-import-template.xlsx"')).mockResolvedValueOnce(new Response("<html>", { headers: { "content-type": "text/html" } }));
    expect(await employeeFileRepository.template()).toEqual({ status: "success", data: true });
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/operations/employees?action=import-template");
    expect(await employeeFileRepository.template()).toMatchObject({ status: "error", httpStatus: 502 });
    expect(click).toHaveBeenCalledTimes(1);
  });
  it("returns the safe code of a refused export and a network failure as errors", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ status: "rejected", code: "MSG-GEN-01" }, { status: 400 })).mockRejectedValueOnce(new Error("offline"));
    expect(await employeeFileRepository.exportFile({})).toEqual({ status: "error", httpStatus: 400, code: "MSG-GEN-01", uncertain: false });
    expect(await employeeFileRepository.exportFile({})).toEqual({ status: "error", httpStatus: 0, uncertain: false });
  });
  it("uploads multipart with the web header and parses the strict result", async () => {
    const data = { imported: 1, errors: [{ row: 3, fields: ["Code"], message: "Missing or invalid.", messageCode: "MSG-GEN-01" }] };
    fetchMock.mockResolvedValue(Response.json({ status: "success", data }));
    const file = new File([new Uint8Array([0x50, 0x4b])], "nv.xlsx");
    expect(await employeeFileRepository.importFile(file)).toEqual({ status: "success", data });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/operations/employees?action=import"); expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("X-OMTS-Request")).toBe("web"); expect(new Headers(init.headers).has("Content-Type")).toBe(false);
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
  });
  it("treats a malformed 200 answer and a server error of an upload as uncertain, never as success", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ status: "success", data: { imported: "2", errors: [] } })).mockResolvedValueOnce(Response.json({ status: "unavailable" }, { status: 503 })).mockResolvedValueOnce(Response.json({ code: "MSG-GEN-01" }, { status: 400 }));
    const file = new File([new Uint8Array([0x50, 0x4b])], "nv.xlsx");
    expect(await employeeFileRepository.importFile(file)).toMatchObject({ status: "error", uncertain: true });
    expect(await employeeFileRepository.importFile(file)).toMatchObject({ status: "error", httpStatus: 503, uncertain: true });
    expect(await employeeFileRepository.importFile(file)).toMatchObject({ status: "error", httpStatus: 400, code: "MSG-GEN-01", uncertain: false });
  });
});
