import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved, environment } from "../employees/__tests__/employee-fixture";
import { handleInputItems } from "./input-items-http";

const id = "122bb318-a72e-49aa-a8d7-a6169f889007";
function setup(permissions: [string, string][], subject = "Staff") {
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  gateway.resolve.mockResolvedValue(resolved());
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType: subject }, permissions: { functionPermissions: permissions.map(([functionCode, action]) => ({ functionCode, action })) } } });
}
const get = (query: string) => new Request(`https://web.example.test/api/input-items?${query}`);
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("input items BFF", () => {
  it("forwards only the filters an action lists and refuses a malformed id before the API", async () => {
    setup([["PURCHASE_RECEIPTS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], page: 1, pageSize: 20, total: 0, summary: { stockValue: 0 } }));
    expect((await handleInputItems(get("action=items&stock=InStock&sortBy=onHand&evil=1&pageSize=20"))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain("/api/farming-input-items/search?stock=InStock&sortBy=onHand&pageSize=20");
    expect(String(fetcher.mock.calls[0][0])).not.toContain("evil");
    expect((await handleInputItems(get("action=item&id=not-a-guid"))).status).toBe(400);
    expect((await handleInputItems(get("action=movements"))).status).toBe(400);
    expect((await handleInputItems(get("action=items&itemGroupId=nope"))).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("forwards the adjustment switch and the kind of the movements, and hands the groups on with their parent", async () => {
    setup([["PURCHASE_RECEIPTS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => String(url).includes("input-item-groups")
      ? Response.json([{ id, name: "Lưới", sortOrder: 1, itemCount: 2, rowVersion: "v", parentId: id }])
      : Response.json({ items: [], page: 1, pageSize: 15, total: 0, unit: "cái" }));
    expect((await handleInputItems(get(`action=movements&id=${id}&kind=Receipt&includeReversals=true&page=1&pageSize=15`))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain(`/api/farming-input-items/${id}/movements?kind=Receipt&includeReversals=true&page=1&pageSize=15`);
    const groups = await handleInputItems(get("action=groups"));
    expect(groups.status).toBe(200);
    expect((await groups.json()).data[0].parentId).toBe(id);
  });

  it("keeps the catalogue writes and the disposals to the Owner and the issue reads to those who hold the issue functions", async () => {
    setup([["PURCHASE_RECEIPTS", "View"], ["INPUT_ISSUES", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleInputItems(get("action=items-export"))).status).toBe(403);
    expect((await handleInputItems(get("action=items-template"))).status).toBe(403);
    expect((await handleInputItems(get("action=issues-export"))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
    setup([["PURCHASE_RECEIPTS", "Export"]]);
    expect((await handleInputItems(get("action=issues"))).status).toBe(403);
    expect((await handleInputItems(get("action=issue-receivers&zoneId=" + id))).status).toBe(403);
  });
});
