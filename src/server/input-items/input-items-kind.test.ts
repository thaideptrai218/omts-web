import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved, environment } from "../employees/__tests__/employee-fixture";
import { handleInputItems } from "./input-items-http";

function setup() {
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  gateway.resolve.mockResolvedValue(resolved());
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType: "Staff" }, permissions: { functionPermissions: [{ functionCode: "PURCHASE_RECEIPTS", action: "View" }] } } });
}
const get = (query: string) => new Request(`https://web.example.test/api/input-items?${query}`);
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("input items BFF: the Giống and Vật tư split", () => {
  it("forwards the kind and the group of the list, which the Giống and Vật tư screens fix", async () => {
    setup();
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ items: [], page: 1, pageSize: 15, total: 0, summary: { stockValue: 0 } }));
    expect((await handleInputItems(get("action=items&kind=Seed&group=Seed&status=InUse"))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain("/api/farming-input-items/search?kind=Seed&group=Seed&status=InUse");
    expect((await handleInputItems(get("action=items&kind=Supply&group=Other"))).status).toBe(200);
    const url = new URL(String(fetcher.mock.calls[1][0]));
    expect(url.searchParams.get("kind")).toBe("Supply");
    expect(url.searchParams.get("group")).toBe("Other");
  });

  it("forwards the kind of the plain list the pickers read and of the file", async () => {
    setup();
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json([]));
    expect((await handleInputItems(get("action=items-all&kind=Seed&statusId=101"))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain("/api/farming-input-items?kind=Seed&statusId=101");
  });
});
