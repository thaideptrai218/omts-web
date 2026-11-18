// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner", username: "chu" }, permissions: { functionPermissions: [] as { functionCode: string; action: string; dataScope?: string; scope?: unknown }[] } },
  detail: vi.fn(), push: vi.fn(),
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock("./repository", () => ({ seedLotRepository: { detail: state.detail } }));
import { SeedLotDetailPanel } from "./seed-lot-detail";
import type { SeedLotState } from "./contracts";
import { ids, seedLotDetailFixture } from "./seed-lot-test-fixtures";

const grant = (...pairs: [string, string][]) => { state.context.permissions.functionPermissions = pairs.map(([functionCode, action]) => ({ functionCode, action, dataScope: "AssignedZone", scope: { kind: "all-zones" } })); };
const mount = async (patch: Record<string, unknown> = {}, lotState: SeedLotState = "PartlySeeded") => {
  state.detail.mockResolvedValue({ status: "success", data: seedLotDetailFixture(patch, lotState) });
  render(<SeedLotDetailPanel id={ids.line} />);
  return screen.findByRole("region", { name: /^Chi tiết PN000004-1/ });
};
const tab = (name: string) => fireEvent.click(screen.getByRole("tab", { name }));

beforeEach(() => { state.context.identity.subjectType = "CooperativeOwner"; state.context.permissions.functionPermissions = []; });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("shows the five tabs and, on Thông tin, the facts with links, the quantity breakdown and the sums", async () => {
  const panel = await mount();
  expect(screen.getAllByRole("tab").map((item) => item.textContent)).toEqual(["Thông tin", "Ươm", "Treo", "Trả hàng", "Lịch sử"]);
  expect(within(panel).getByRole("heading", { name: "PN000004-1" })).toBeTruthy();
  expect(within(panel).getByRole("link", { name: "PN000004" }).getAttribute("href")).toBe("/operations/seed-receipts?code=PN000004");
  expect(within(panel).getByRole("link", { name: "Trại giống Vân Đồn" }).getAttribute("href")).toBe("/workspace/suppliers?code=NCC000001");
  expect(within(panel).getByRole("link", { name: "Hàu giống 3 cm" }).getAttribute("href")).toBe("/inputs/seeds?code=GG000001");
  expect(within(panel).getByRole("link", { name: "Hàu sữa" }).getAttribute("href")).toBe("/sales/products?code=SP000001");
  const table = within(panel).getByRole("table", { name: "Số lượng của lô giống" });
  expect(within(table).getAllByRole("row").slice(1).map((row) => (row as HTMLTableRowElement).cells[0].textContent)).toEqual(["Nhập", "Đã trả nhà cung cấp", "Đang ươm", "Hao hụt khi ươm", "Đã treo", "Xuất khác", "Còn lại"]);
  expect(within(within(table).getByText("Nhập").closest("tr")!).getByText("1.000")).toBeTruthy();
  expect(within(within(table).getByText("Đã trả nhà cung cấp").closest("tr")!).getByText("10%")).toBeTruthy();
  expect(within(panel).queryByText("Lô đã được treo một phần, phần còn lại chưa dùng.")).toBeNull();
  const chips = within(panel).getByRole("list", { name: "Tình hình sử dụng lô giống" });
  expect(within(chips).getAllByRole("listitem").map((item) => item.firstElementChild!.textContent)).toEqual(["Đã nhập", "Đang ươm", "Đã thả nuôi", "Thu hoạch", "Đã bán", "Còn trong kho"]);
  expect(within(chips).getByText("195,5 (ước tính)")).toBeTruthy();
  expect(within(chips).getByText("120 (ước tính)")).toBeTruthy();
  expect(within(chips).getByText("Ươm xong: sống 250")).toBeTruthy();
});

it.each<[SeedLotState, boolean]>([["Unused", true], ["PartlySeeded", true], ["Nursing", false], ["FullySeeded", false], ["FullyReturned", false], ["FullyLost", false], ["UsedUp", false]])(
  "the actions of a %s lot are shown: %s", async (lotState, shown) => {
    await mount({ remainingQty: lotState === "Unused" || lotState === "PartlySeeded" ? 500 : 0, availableQty: lotState === "Unused" || lotState === "PartlySeeded" ? 500 : 0 }, lotState);
    for (const name of ["Ươm", "Trả hàng"]) expect(!!screen.queryByRole("button", { name })).toBe(shown);
    // Seed is nursed before it is hung: a seed lot never offers Treo.
    expect(screen.queryByRole("button", { name: "Treo" })).toBeNull();
  });

it("offers no action on an open lot whose remaining stock is all in the nursery", async () => {
  await mount({ remainingQty: 300, nursingQty: 300, availableQty: 0 }, "PartlySeeded");
  expect(screen.queryByRole("button", { name: "Ươm" })).toBeNull();
});

it("opens the nursery and the return with the lot chosen from the footer of Thông tin", async () => {
  await mount();
  fireEvent.click(screen.getByRole("button", { name: "Ươm" }));
  fireEvent.click(screen.getByRole("button", { name: "Trả hàng" }));
  expect(state.push.mock.calls.map(([href]) => href)).toEqual([`/farming/nursery?lot=${ids.line}`, `/operations/seed-returns/new?receipt=${ids.receipt}&line=${ids.line}`]);
});

it("keeps the Ươm action on Ươm, hangs a finished batch from its row, and has no action on Treo", async () => {
  await mount();
  tab("Ươm");
  expect(screen.getByRole("button", { name: "Ươm" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Treo lên bè" }).getAttribute("href")).toBe(`/farming/cycles?nurseryBatch=${ids.nursery}`);
  tab("Treo");
  expect(screen.queryByRole("button", { name: /^(Ươm|Treo|Trả hàng)$/ })).toBeNull();
  tab("Trả hàng");
  expect(screen.getByRole("button", { name: "Trả hàng" })).toBeTruthy();
  tab("Lịch sử");
  expect(screen.queryByRole("button", { name: /^(Ươm|Treo|Trả hàng)$/ })).toBeNull();
});

it("hides the actions an account has no right for", async () => {
  state.context.identity.subjectType = "Staff";
  grant(["PURCHASE_RECEIPTS", "View"], ["CULTIVATION_CYCLES", "View"], ["PURCHASE_RECEIPTS", "Create"]);
  await mount();
  expect(screen.queryByRole("button", { name: "Ươm" })).toBeNull();
  expect(screen.getByRole("button", { name: "Trả hàng" })).toBeTruthy();
  tab("Ươm");
  expect(screen.queryByRole("link", { name: "Treo lên bè" })).toBeNull();
});

it("lists the nursery batches with their status and a link by code", async () => {
  await mount(); tab("Ươm");
  const table = screen.getByRole("table", { name: "Đợt ươm của lô giống" });
  expect(within(table).getByRole("link", { name: "NU000002" }).getAttribute("href")).toBe("/farming/nursery?code=NU000002");
  expect(within(table).getByText("Đã ươm xong")).toBeTruthy();
  expect(within(table).getByText("11/11/2026")).toBeTruthy();
});

it("says so on a tab with nothing to list", async () => {
  await mount({ nurseryBatches: [], seedings: [], cycles: [], harvestLots: [], returns: [], issues: [] }, "Unused");
  tab("Ươm"); expect(screen.getByText("Lô chưa được ươm.")).toBeTruthy();
  tab("Treo"); expect(screen.getByText(/^Lô chưa được treo\. Giống phải ươm trước/)).toBeTruthy();
  tab("Trả hàng"); expect(screen.getByText("Lô chưa có phiếu trả hay phiếu xuất nào.")).toBeTruthy();
});

it("lists the seedings, the cycles and the harvest lots on Treo, and the returns and issues on Trả hàng", async () => {
  await mount(); tab("Treo");
  expect(within(screen.getByRole("table", { name: "Lần thả giống của lô" })).getByText("400")).toBeTruthy();
  expect(within(screen.getByRole("table", { name: "Chu kỳ nuôi từ lô giống" })).getByText("SP000001")).toBeTruthy();
  expect(within(screen.getByRole("table", { name: "Lô thu hoạch từ lô giống" })).getByRole("link", { name: "LTH000007" }).getAttribute("href")).toBe("/farming/harvest-lots?code=LTH000007");
  tab("Trả hàng");
  expect(within(screen.getByRole("table", { name: "Phiếu trả của lô giống" })).getByRole("link", { name: "TH000001" }).getAttribute("href")).toBe("/operations/seed-returns?code=TH000001");
  expect(within(screen.getByRole("table", { name: "Phiếu xuất của lô giống" })).getByRole("link", { name: "XH000001" }).getAttribute("href")).toBe("/inputs/disposals?code=XH000001");
});

it("shows the history newest first", async () => {
  await mount(); tab("Lịch sử");
  const items = within(screen.getByRole("list", { name: "Lịch sử của lô giống" })).getAllByRole("listitem");
  expect(items[0].textContent).toContain("Thả giống");
  expect(items.at(-1)?.textContent).toContain("Nhập lô");
});

it("shows an error with a retry, and a loading state before", async () => {
  state.detail.mockResolvedValueOnce({ status: "error", httpStatus: 500, uncertain: false });
  render(<SeedLotDetailPanel id={ids.line} />);
  fireEvent.click(await screen.findByRole("button", { name: "Tải lại lô giống" }));
  await waitFor(() => expect(state.detail).toHaveBeenCalledTimes(2));
});
