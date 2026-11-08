import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { purchasingV2Plan } from "./purchasing-v2-plan";
const supplier = "20000000-0000-4000-8000-000000000001";
it("forwards receipt filters before paging and requires Export for the file", () => {
 const filters = `supplierId=${supplier}&raftId=${supplier}&itemGroup=Material&statusId=1702&from=2026-11-01&to=2026-11-08&code=PN&page=2&pageSize=20`;
 const list = purchasingV2Plan("purchase-receipts", "GET", new URLSearchParams(`action=list&${filters}`));
 const file = purchasingV2Plan("purchase-receipts", "GET", new URLSearchParams(`action=export&${filters}`));
 expect(list?.permission).toBe("View"); expect(file).toMatchObject({permission:"Export",file:"export",method:"GET"});
 const url = new URL(list!.path, "http://backend.test");
 expect(url.searchParams.get("raftId")).toBe(supplier); expect(url.searchParams.get("supplierId")).toBe(supplier); expect(url.searchParams.get("itemGroup")).toBe("Material");
 expect(new URL(file!.path,"http://backend.test").search).toBe(url.search);
 expect(purchasingV2Plan("supplier-payments", "GET", new URLSearchParams("action=export"))).toBeUndefined();
});
it.each(["action=list&from=2026-11-09&to=2026-11-01", "action=list&itemGroup=Unknown", "action=list&raftId=bad", "action=list&page=1&page=2", "action=export&url=https://outside.test"])("rejects invalid receipt query %s", query => {
 expect(purchasingV2Plan("purchase-receipts", "GET", new URLSearchParams(query))).toBeUndefined();
});
