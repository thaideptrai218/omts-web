import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved, replacedSession } from "../employees/__tests__/employee-fixture";
import { handleFarmingRequest } from "./farming-http";
import { planFarming } from "./farming-plan";
import { farmingIds as ids, licenseFixture, raftFixture } from "@/features/farming-api/fixtures";
import { saveLicenseSchema } from "@/features/farming-api/contracts";
function configure(subjectType = "CooperativeOwner") {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000");
  vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.mode = "api"; gateway.resolve.mockResolvedValue(resolved()); gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType }, permissions: { functionPermissions: [] } } });
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
const get = (query: string) => new Request(`http://localhost:3002/api/operations/zone-licenses?${query}`);
const payload = { documentType: "AQUACULTURE_LICENSE", documentNumber: "QA-GP-01", effectiveDate: "2026-01-01", expiryDate: "2027-01-01", issuingAuthority: null, holder: null, legalScope: null, zoneIds: [ids.zone, ids.otherZone] };
function upload(action: string, body: unknown, files: File[] = [], area = "zone-licenses", origin = "http://localhost:3002") {
  const form = new FormData(); form.set("payload", JSON.stringify(body));
  for (const file of files) form.append(area === "raft-details" ? "photo" : "files", file);
  return new Request(`http://localhost:3002/api/operations/${area}?action=${action}${action === "create" ? "" : `&id=${ids.license}`}`, { method: "POST", body: form, headers: { Origin: origin, "X-OMTS-Request": "web" } });
}
describe("farming API plans and validation", () => {
  it.each(["action=detail&id=bad", `action=detail&id=${ids.license}&url=https://evil.test`, `action=list&zoneId=${ids.zone}&asOf=2026-02-30`, `action=detail&id=${ids.license}&id=${ids.raft}`, `action=update&id=${ids.license}&asOf=2026-01-01`])("rejects invalid or ambiguous query %s", (query) => {
    expect(planFarming("zone-licenses", query.startsWith("action=update") ? "POST" : "GET", new URLSearchParams(query))).toBeUndefined();
  });
  it("maps as-of licenses to fixed read paths and drops the removed condition action", () => {
    expect(planFarming("zone-licenses", "GET", new URLSearchParams({ action: "list", zoneId: ids.zone, asOf: "2026-01-01" }))?.path).toBe(`/api/zones/${ids.zone}/licenses?asOf=2026-01-01`);
    expect(planFarming("raft-details", "GET", new URLSearchParams({ action: "condition", id: ids.raft }))).toBeUndefined();
    expect(planFarming("raft-details", "POST", new URLSearchParams({ action: "upload-photo", id: ids.raft }))?.path).toBe(`/api/rafts/${ids.raft}/photos`);
  });
  it.each([{ ...payload, expiryDate: "2025-01-01" }, { ...payload, zoneIds: [] }, { ...payload, zoneIds: [ids.zone, ids.zone] }, { ...payload, secret: "bad" }])("rejects invalid dates, scopes and extra write fields", (body) => expect(saveLicenseSchema.safeParse(body).success).toBe(false));
});
describe("farming BFF authorization, uploads and file projection", () => {
  it.each(["Staff", "Trader", "SystemAdministrator"])("refuses license access and writes for %s", async (subject) => {
    configure(subject); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleFarmingRequest(get(`action=list&zoneId=${ids.zone}`), "zone-licenses")).status).toBe(403);
    expect((await handleFarmingRequest(upload("upload-photo", {}, [], "raft-details"), "raft-details")).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("requires authentication and relays the API refusal of an account that still owes onboarding", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch"); gateway.resolve.mockResolvedValueOnce({ status: "anonymous" });
    expect((await handleFarmingRequest(get(`action=detail&id=${ids.license}`), "zone-licenses")).status).toBe(401); expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValueOnce(Response.json({ code: "MSG-ACCOUNT-04" }, { status: 403 }));
    expect((await handleFarmingRequest(get(`action=detail&id=${ids.license}`), "zone-licenses")).status).toBe(403);
  });
  it("does not read files when the backend refuses a staff raft in another zone", async () => {
    configure("Staff"); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: "MSG02" }, { status: 403 }));
    expect((await handleFarmingRequest(get(`action=photo&id=${ids.raft}&photoId=${ids.lane}`), "raft-details")).status).toBe(403); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("allows scoped raft detail reads only through the protected backend endpoint", async () => {
    configure("Staff"); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(raftFixture()));
    expect((await handleFarmingRequest(get(`action=detail&id=${ids.raft}`), "raft-details")).status).toBe(200);
    expect(fetcher.mock.calls[0][0].toString()).toBe(`http://127.0.0.1:8080/api/rafts/${ids.raft}`);
  });
  it("checks CSRF before consuming a multipart body", async () => {
    configure(); const request = upload("create", payload, [], "zone-licenses", "https://evil.test"), read = vi.spyOn(request.body!, "getReader"), fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleFarmingRequest(request, "zone-licenses")).status).toBe(403); expect(read).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it("allows edits without a file, sends repeated zone fields and strips upstream secrets", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...licenseFixture({ fileUrl: "/api/files/local/qa.pdf?expires=123&sig=secret" }), accessToken: "never-return" }));
    const response = await handleFarmingRequest(upload("update", { ...payload, rowVersion: "AQID" }), "zone-licenses");
    expect(response.status).toBe(200); const form = fetcher.mock.calls[0][1]?.body as FormData;
    expect(form.getAll("zoneIds")).toEqual([ids.zone, ids.otherZone]); expect(form.has("file")).toBe(false); expect(fetcher.mock.calls[0][1]?.method).toBe("PUT");
    const text = await response.text(); expect(text).toContain(`/api/operations/zone-licenses?action=file&id=${ids.license}`); expect(text).not.toContain("secret"); expect(text).not.toContain("never-return");
  });
  it.each(["create", "replace"])("requires a file for %s and a version for update", async (action) => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleFarmingRequest(upload(action, payload), "zone-licenses")).status).toBe(400);
    expect((await handleFarmingRequest(upload("update", payload), "zone-licenses")).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects extra files and wrong media types before writing", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch"), file = new File(["pdf"], "qa.pdf", { type: "application/pdf" });
    expect((await handleFarmingRequest(upload("create", payload, [file, file]), "zone-licenses")).status).toBe(400);
    expect((await handleFarmingRequest(upload("upload-photo", {}, [file], "raft-details"), "raft-details")).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it("uploads raft photo to the photos route, unwraps RaftSaved and projects photo URLs without the signature", async () => {
    const raft = raftFixture({ photos: [{ id: ids.lane, sortOrder: 1, url: "/api/files/local/a.png?sig=private&expires=123" }] });
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ raft, message: "Raft saved.", messageCode: "MSG-GEN-05" }));
    const response = await handleFarmingRequest(upload("upload-photo", {}, [new File(["png"], "qa.png", { type: "image/png" })], "raft-details"), "raft-details");
    expect(response.status).toBe(200); expect((fetcher.mock.calls[0][1]?.body as FormData).has("file")).toBe(true);
    expect(fetcher.mock.calls[0][0].toString()).toBe(`http://127.0.0.1:8080/api/rafts/${ids.license}/photos`);
    const text = await response.text(); expect(text).not.toContain("private"); expect(text).toContain(`/api/operations/raft-details?action=photo&id=${ids.raft}&photoId=${ids.lane}`);
  });
  it("plans a raft photo delete as POST from the browser and DELETE upstream, only for a raft id plus a photo id", () => {
    const plan = planFarming("raft-details", "POST", new URLSearchParams({ action: "delete-photo", id: ids.raft, photoId: ids.lane }));
    expect(plan).toMatchObject({ method: "DELETE", path: `/api/rafts/${ids.raft}/photos/${ids.lane}`, unwrap: "raft", ownerOnly: true });
    for (const query of [{ action: "delete-photo", id: ids.raft }, { action: "delete-photo", photoId: ids.lane }, { action: "delete-photo", id: ids.raft, photoId: ids.lane, zoneId: ids.zone }] as Record<string, string>[])
      expect(planFarming("raft-details", "POST", new URLSearchParams(query))).toBeUndefined();
    expect(planFarming("raft-details", "GET", new URLSearchParams({ action: "delete-photo", id: ids.raft, photoId: ids.lane }))).toBeUndefined();
    expect(planFarming("zone-licenses", "POST", new URLSearchParams({ action: "delete-photo", id: ids.raft, photoId: ids.lane }))).toBeUndefined();
  });
  it("deletes a raft photo upstream with DELETE, needs the CSRF header and returns the raft without signed URLs", async () => {
    const raft = raftFixture({ photos: [] });
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ raft, message: "Raft saved.", messageCode: "MSG-GEN-05" }));
    const url = `http://localhost:3002/api/operations/raft-details?action=delete-photo&id=${ids.raft}&photoId=${ids.lane}`;
    expect((await handleFarmingRequest(new Request(url, { method: "POST", headers: { Origin: "http://localhost:3002" } }), "raft-details")).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
    const response = await handleFarmingRequest(new Request(url, { method: "POST", headers: { Origin: "http://localhost:3002", "X-OMTS-Request": "web" } }), "raft-details");
    expect(response.status).toBe(200);
    expect(fetcher.mock.calls[0][1]?.method).toBe("DELETE");
    expect(fetcher.mock.calls[0][0].toString()).toBe(`http://127.0.0.1:8080/api/rafts/${ids.raft}/photos/${ids.lane}`);
  });
  it("proxies one raft photo chosen by its id", async () => {
    const raft = raftFixture({ photos: [{ id: ids.lane, sortOrder: 1, url: "/api/files/local/a.png?sig=private&expires=123" }] });
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(raft)).mockResolvedValueOnce(new Response(new Uint8Array([1]), { headers: { "Content-Type": "image/png" } }));
    expect((await handleFarmingRequest(get(`action=photo&id=${ids.raft}&photoId=${ids.lane}`), "raft-details")).status).toBe(200); expect(fetcher).toHaveBeenCalledTimes(2);
    fetcher.mockResolvedValueOnce(Response.json(raft));
    expect((await handleFarmingRequest(get(`action=photo&id=${ids.raft}&photoId=${ids.raft}`), "raft-details")).status).toBe(404);
  });
  it("loads the authorized parent, then proxies only a local file without bearer", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(licenseFixture({ fileUrl: "/api/files/local/qa.pdf?expires=123&sig=private" })))
      .mockResolvedValueOnce(new Response(new Uint8Array([37, 80, 68, 70]), { headers: { "Content-Type": "application/pdf" } }));
    const response = await handleFarmingRequest(get(`action=file&id=${ids.license}`), "zone-licenses");
    expect(response.status).toBe(200); expect(response.headers.get("content-disposition")).toContain("attachment"); expect(response.headers.get("cache-control")).toContain("no-store"); expect(fetcher.mock.calls[1][1]?.headers).toBeUndefined();
  });
  it("rejects off-origin storage URLs instead of forwarding a request", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(licenseFixture({ fileUrl: "https://evil.test/a.pdf" })));
    expect((await handleFarmingRequest(get(`action=file&id=${ids.license}`), "zone-licenses")).status).toBe(404); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("suppresses a successful write response when the session changes during upload", async () => {
    configure(); gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(replacedSession());
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(licenseFixture()));
    const response = await handleFarmingRequest(upload("update", { ...payload, rowVersion: "AQID" }), "zone-licenses");
    expect(response.status).toBe(401); expect(await response.text()).not.toContain("QA-GP-01");
  });
});
