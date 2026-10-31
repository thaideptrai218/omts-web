import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved, environment } from "../employees/__tests__/employee-fixture";
import { certificateTarget, handleSupplierDocuments } from "./supplier-documents-http";
const id = "122bb318-a72e-49aa-a8d7-a6169f889007", origin = "http://127.0.0.1:5280", url = `${origin}/api/files/local/supplier-certificates/qa.pdf?expires=1&sig=qa`;
const supplier = () => ({ id, name: "QA", supplierType: "Seed", phoneNumber: "0900000000", otherContacts: null, statusId: 101, status: "In Use", debt: 0, rowVersion: "v2", certificates: [{ index: 0, url }] });
function setup(subject = "CooperativeOwner", actions = ["View", "Edit"]) {
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  gateway.resolve.mockResolvedValue(resolved()); gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType: subject }, permissions: { functionPermissions: actions.map((action) => ({ functionCode: "SUPPLIERS", action })) } } });
}
function request(post = false, search = `id=${id}`, foreign = false) {
  const form = new FormData(); form.set("payload", "{}"); form.append("files", new File(["%PDF-1.4\nqa"], "qa.pdf", { type: "application/pdf" }));
  return new Request(`https://web.example.test/api/supplier-documents?${search}`, { method: post ? "POST" : "GET", ...(post ? { body: form, headers: { Origin: foreign ? "https://evil.test" : "https://web.example.test", "X-OMTS-Request": "web" } } : {}) });
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
describe("supplier certificate privacy and identity", () => {
  it("projects only private proxy links and a fresh metadata version", async () => {
    setup(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...supplier(), passwordHash: "never-return" }));
    const response = await handleSupplierDocuments(request()), body = await response.json(); expect(response.status).toBe(200); expect(body.data.rowVersion).toBe("v2"); expect(body.data.certificates[0].url).toContain("/api/supplier-documents?"); expect(JSON.stringify(body)).not.toContain("sig=qa"); expect(JSON.stringify(body)).not.toContain("never-return"); expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it.each(["Trader", "SystemAdministrator"])("denies %s before upstream", async (subject) => { setup(subject); const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handleSupplierDocuments(request())).status).toBe(403); expect(fetcher).not.toHaveBeenCalled(); });
  it("requires View for reading and Edit for upload, and enforces CSRF", async () => {
    setup("Staff", ["View"]); const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handleSupplierDocuments(request(true))).status).toBe(403); expect((await handleSupplierDocuments(request(true, `id=${id}`, true))).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("uploads bounded multipart documents and returns canonical supplier data", async () => {
    setup(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(supplier())); const response = await handleSupplierDocuments(request(true)); expect(response.status).toBe(200); expect(String(fetcher.mock.calls[0][0])).toBe(`${origin}/api/suppliers/${id}/certificates`); const body = fetcher.mock.calls[0][1]?.body as FormData; expect(body.getAll("files")).toHaveLength(1); expect(body.has("payload")).toBe(false);
  });
  it("refuses a stale index fingerprint without downloading a different document", async () => {
    setup(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(supplier())); const response = await handleSupplierDocuments(request(false, `id=${id}&index=0&fingerprint=${"a".repeat(64)}`)); expect(response.status).toBe(409); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("reads file bytes only after the supplier check and rechecks the session", async () => {
    setup(); const fingerprint = certificateTarget(url, origin)!.fingerprint; vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(supplier())).mockResolvedValueOnce(new Response("%PDF-qa", { headers: { "Content-Type": "application/pdf" } }));
    const response = await handleSupplierDocuments(request(false, `id=${id}&index=0&fingerprint=${fingerprint}`)); expect(response.status).toBe(200); expect(await response.text()).toBe("%PDF-qa"); expect(response.headers.get("content-security-policy")).toContain("sandbox"); expect(gateway.resolve).toHaveBeenCalledTimes(3);
  });
  it("does not expose upload result after session replacement", async () => {
    setup(); gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce({ status: "anonymous" }); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(supplier())); expect((await handleSupplierDocuments(request(true))).status).toBe(401);
  });
  it.each(["https://evil.test/api/files/local/supplier-certificates/qa.pdf", `${origin}/api/files/local/raft-photos/qa.png`, `${origin}/api/files/local/supplier-certificates/qa.pdf?redirect=evil`])("rejects a non-certificate evidence target %s", (value) => { expect(certificateTarget(value, origin)).toBeUndefined(); });
});
