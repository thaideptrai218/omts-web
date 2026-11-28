// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner", username: "chu" }, permissions: { functionPermissions: [] as { functionCode: string; action: string }[] } },
  listReceipts: vi.fn(), listReturns: vi.fn(), getReceipt: vi.fn(), getReturn: vi.fn(), push: vi.fn(),
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: state.push, replace: vi.fn() }) }));
vi.mock("./repository", async (original) => ({
  ...(await original<typeof import("./repository")>()),
  listReceipts: state.listReceipts, listReturns: state.listReturns, getReceipt: state.getReceipt, getReturn: state.getReturn,
  getReceiptPayments: vi.fn(async () => ({ status: "success", data: [] })), download: vi.fn(), removeReceipts: vi.fn(),
  usePurchaseLookups: () => ({ vatCatalogue: { rates: [], legacy: false }, suppliers: [{ id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b08", code: "NCC000001", name: "Trại giống", phone: "" }], items: [], rafts: [], receivers: [], loading: false, refresh: vi.fn() }),
}));
import { PurchaseReceiptsScreen } from "./receipts-screen";
import { PurchaseReturnsScreen } from "./returns-screen";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { Receipt } from "./types";

const id = (n: number) => `0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0${n}`;
const receiptRow = (patch: object = {}) => ({ id: id(1), code: "PN000004", receiptDate: "2026-11-10", supplier: { id: id(8), code: "NCC000001", name: "Trại giống", phoneNumber: "" }, statusId: 1702, status: "Completed", total: 100, linesTotal: 1, supplierCode: "NCC000001",
  recordedByName: "Chủ", itemCount: 1, returned: 0, discount: 0, payable: 100, paid: 0, createdAt: "2026-11-10T08:00:00+07:00", receivedAt: "2026-11-10T08:00:00+07:00", returnCodes: ["TH000001"], kind: "Seed", ...patch });
const returnRow = (patch: object = {}) => ({ id: id(2), code: "TH000001", returnDate: "2026-11-12", receiptId: id(1), receiptCode: "PN000004", supplier: { id: id(8), code: "NCC000001", name: "Trại giống", phoneNumber: "" }, supplierCode: "NCC000001", reason: "Hỏng",
  statusId: 1901, status: "Recorded", recordedBy: { id: id(9), name: "Chủ" }, value: 10, discount: 0, netValue: 10, itemCount: 1, refunded: 0, createdAt: "2026-11-12T08:00:00+07:00", returnedAt: "2026-11-12T08:00:00+07:00", kind: "Seed", ...patch });
const seedReceipt = (lotState: string | null, patch: Partial<Receipt> = {}): Receipt => ({
  id: id(1), code: "PN000004", kind: "Seed", seedState: lotState as never, date: "2026-11-10", receivedAt: "2026-11-10T08:00:00+07:00", receivedBy: null, completedAt: null, rowVersion: "v1", supplier: { id: id(8), code: "NCC000001", name: "Trại giống", phone: "" }, zone: null,
  recordedBy: "Chủ", statusId: 1702, discount: 0, payable: 100, paid: 0, notes: null, vatTotal: 0, cancelReason: null,
  lines: [{ id: id(3), item: { id: id(4), code: "GG000001", name: "Hàu giống 3 cm", unit: "mảnh", group: "Seed", units: [] }, itemUnitId: null, unitFactor: 1, quantity: 100, unitPrice: 1, raft: null, supplierLotCode: null, seedLotCode: "PN000004-1",
    seedLot: lotState ? { state: lotState as never, remainingQty: 40 } : null, seeded: 60, returned: 0, returnable: 40, discount: 0, netUnitPrice: 1, vatRateId: "KCT", vatRateName: "KCT", vatPercent: null, vatAmount: 0 }],
  returns: [{ id: id(2), code: "TH000001", date: "2026-11-12", returnedAt: null, reason: "Hỏng", value: 10, statusId: 1901 }], ...patch,
});

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* storage may be unavailable */ }
  state.context.identity.subjectType = "CooperativeOwner";
  state.listReceipts.mockResolvedValue({ status: "success", data: { items: [receiptRow()], page: 1, total: 1, totals: { received: 100, returned: 0, net: 100 } } });
  state.listReturns.mockResolvedValue({ status: "success", data: { items: [returnRow()], page: 1, total: 1, totalValue: 10 } });
  state.getReceipt.mockResolvedValue({ status: "success", data: seedReceipt("PartlySeeded") });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const wrap = (node: React.ReactNode) => render(<ToastProvider>{node}</ToastProvider>);

it("fixes the Nhập giống list to the Seed kind, with no group pills, its own title and a new-receipt button on its own route", async () => {
  wrap(<PurchaseReceiptsScreen kind="Seed" />);
  await screen.findByText("PN000004");
  expect(state.listReceipts.mock.calls[0][0]).toMatchObject({ kind: "Seed", group: "" });
  expect(screen.getAllByText("Nhập giống").length).toBeGreaterThan(1);
  expect(screen.queryByRole("radio", { name: "Giống" })).toBeNull();
  expect(screen.queryByRole("radio", { name: "Vật tư" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Nhập giống/ }));
  expect(state.push).toHaveBeenCalledWith("/operations/seed-receipts/new");
  const line = screen.getByText("PN000004").closest("tr")!;
  expect(within(line).getByRole("link", { name: "TH000001" }).getAttribute("href")).toBe("/operations/seed-returns?code=TH000001");
});

it("fixes the Nhập vật tư list to the Supply kind and offers only Vật tư and Khác to narrow it", async () => {
  state.listReceipts.mockResolvedValue({ status: "success", data: { items: [receiptRow({ kind: "Supply", returnCodes: ["TH000002"] })], page: 1, total: 1, totals: { received: 1, returned: 0, net: 1 } } });
  wrap(<PurchaseReceiptsScreen kind="Supply" />);
  await screen.findByText("PN000004");
  expect(state.listReceipts.mock.calls[0][0]).toMatchObject({ kind: "Supply", group: "" });
  expect(screen.queryByRole("radio", { name: "Giống" })).toBeNull();
  fireEvent.click(screen.getByRole("radio", { name: "Khác" }));
  await waitFor(() => expect(state.listReceipts.mock.calls.at(-1)![0]).toMatchObject({ kind: "Supply", group: "Other" }));
  fireEvent.click(screen.getByRole("button", { name: /Nhập vật tư/ }));
  expect(state.push).toHaveBeenCalledWith("/operations/supply-receipts/new");
  expect(within(screen.getByText("PN000004").closest("tr")!).getByRole("link", { name: "TH000002" }).getAttribute("href")).toBe("/operations/supply-returns?code=TH000002");
});

it("shows the state of the seed lot of each line of a seed receipt, linked to Lô giống, and the combined state in the head", async () => {
  wrap(<PurchaseReceiptsScreen kind="Seed" />);
  fireEvent.click(await screen.findByRole("button", { name: "Mở PN000004" }));
  const panel = await screen.findByRole("region", { name: "Chi tiết PN000004" });
  expect(within(panel).getByRole("link", { name: "PN000004-1" }).getAttribute("href")).toBe("/farming/seed-lots?code=PN000004-1");
  expect(within(panel).getAllByText("Đang thả dở")).toHaveLength(2);
  expect(within(panel).getByText(/còn 40/)).toBeTruthy();
  expect(within(panel).getByRole("link", { name: "GG000001" }).getAttribute("href")).toBe("/inputs/seeds?code=GG000001");
  expect(within(panel).getByRole("button", { name: "Trả giống nhập" })).toBeTruthy();
});

it("shows no lot state on a line whose API sends none", async () => {
  state.getReceipt.mockResolvedValue({ status: "success", data: seedReceipt(null) });
  wrap(<PurchaseReceiptsScreen kind="Seed" />);
  fireEvent.click(await screen.findByRole("button", { name: "Mở PN000004" }));
  const panel = await screen.findByRole("region", { name: "Chi tiết PN000004" });
  expect(within(panel).queryByText("Đang thả dở")).toBeNull();
  expect(within(panel).queryByText("Chưa dùng")).toBeNull();
});

it("opens the return, the copy and the edit of a seed receipt on the seed routes", async () => {
  wrap(<PurchaseReceiptsScreen kind="Seed" />);
  fireEvent.click(await screen.findByRole("button", { name: "Mở PN000004" }));
  const panel = await screen.findByRole("region", { name: "Chi tiết PN000004" });
  fireEvent.click(within(panel).getByRole("button", { name: "Trả giống nhập" }));
  fireEvent.click(within(panel).getByRole("button", { name: /Sao chép/ }));
  fireEvent.click(within(panel).getByRole("button", { name: "Mở phiếu" }));
  expect(state.push.mock.calls.map(([href]) => href)).toEqual([`/operations/seed-returns/new?receipt=${id(1)}`, `/operations/seed-receipts/new?copy=${id(1)}`, `/operations/seed-receipts/${id(1)}/edit`]);
});

it("fixes the returns list to its kind and links the receipt on the screen of that kind", async () => {
  wrap(<PurchaseReturnsScreen kind="Seed" />);
  await screen.findByText("TH000001");
  expect(state.listReturns.mock.calls[0][0]).toMatchObject({ kind: "Seed" });
  expect(within(screen.getByText("TH000001").closest("tr")!).getByRole("link", { name: "PN000004" }).getAttribute("href")).toBe("/operations/seed-receipts?code=PN000004");
  fireEvent.click(screen.getByRole("button", { name: /Trả giống nhập/ }));
  expect(state.push).toHaveBeenCalledWith("/operations/seed-returns/new");
});

it("fixes the Trả vật tư nhập list to the Supply kind", async () => {
  state.listReturns.mockResolvedValue({ status: "success", data: { items: [returnRow({ kind: "Supply" })], page: 1, total: 1, totalValue: 10 } });
  wrap(<PurchaseReturnsScreen kind="Supply" />);
  await screen.findByText("TH000001");
  expect(state.listReturns.mock.calls[0][0]).toMatchObject({ kind: "Supply" });
  expect(within(screen.getByText("TH000001").closest("tr")!).getByRole("link", { name: "PN000004" }).getAttribute("href")).toBe("/operations/supply-receipts?code=PN000004");
  fireEvent.click(screen.getByRole("button", { name: /Trả vật tư nhập/ }));
  expect(state.push).toHaveBeenCalledWith("/operations/supply-returns/new");
});

it("shows an error with a retry on a list that failed", async () => {
  state.listReceipts.mockResolvedValueOnce({ status: "error", httpStatus: 500, uncertain: false });
  wrap(<PurchaseReceiptsScreen kind="Seed" />);
  fireEvent.click(await screen.findByRole("button", { name: "Tải lại" }));
  await screen.findByText("PN000004");
});
