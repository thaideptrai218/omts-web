// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner", username: "chu" }, permissions: { functionPermissions: [] as { functionCode: string; action: string }[] } },
  getReceipt: vi.fn(), getReturn: vi.fn(), saveReceipt: vi.fn(), saveReturn: vi.fn(), push: vi.fn(), replace: vi.fn(),
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: state.push, replace: state.replace }) }));
vi.mock("./repository", async (original) => ({
  ...(await original<typeof import("./repository")>()),
  getReceipt: state.getReceipt, getReturn: state.getReturn, saveReceipt: state.saveReceipt, saveReturn: state.saveReturn, getReceiptCopy: vi.fn(), removeReceipts: vi.fn(), removeReturn: vi.fn(),
  usePurchaseLookups: () => ({ vatCatalogue: { rates: [], legacy: false },
    suppliers: [{ id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b08", code: "NCC000001", name: "Trại giống", phone: "" }], rafts: [], receivers: [], loading: false, refresh: vi.fn(),
    items: [
      { id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b04", code: "GG000001", name: "Hàu giống 3 cm", unit: "mảnh", group: "Seed", units: [{ id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b11", name: "mảnh", factor: 1, code: "GG-M", isBase: true }] },
      { id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b05", code: "VT000001", name: "Phao nhựa", unit: "cái", group: "Material", basePrice: 1500, units: [{ id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b12", name: "cái", factor: 1, code: "VT-C", isBase: true }] },
      { id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b06", code: "VT000002", name: "Dây thừng", unit: "cuộn", group: "Other", units: [{ id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b13", name: "cuộn", factor: 1, code: "VT-D", isBase: true }] },
    ],
  }),
}));
import { ReceiptEditorPage } from "./receipt-editor";
import { ReturnEditorPage } from "./return-editor";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { PurchaseReturn, Receipt } from "./types";

const id = (n: number) => `0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0${n}`;
const lineId = (n: number) => `0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d1b0${n}`;
const receipt = (patch: Partial<Receipt> = {}): Receipt => ({
  id: id(1), code: "PN000004", kind: "Seed", seedState: null, date: "2026-11-10", receivedAt: "2026-11-10T08:00:00+07:00", receivedBy: null, completedAt: "2026-11-10T08:00:00+07:00", rowVersion: "v1",
  supplier: { id: id(8), code: "NCC000001", name: "Trại giống", phone: "" }, zone: null, recordedBy: "Chủ", statusId: 1702, discount: 0, payable: 200, paid: 0, notes: null, vatTotal: 0, cancelReason: null,
  lines: [
    { id: lineId(1), item: { id: id(4), code: "GG000001", name: "Hàu giống 3 cm", unit: "mảnh", group: "Seed", units: [] }, itemUnitId: null, unitFactor: 1, quantity: 100, unitPrice: 1, raft: null, supplierLotCode: null, seedLotCode: "PN000004-1", seedLot: null, seeded: 60, returned: 0, returnable: 40, discount: 0, netUnitPrice: 1, vatRateId: "KCT", vatRateName: "KCT", vatPercent: null, vatAmount: 0 },
    { id: lineId(2), item: { id: id(5), code: "GG000002", name: "Hàu giống 5 cm", unit: "mảnh", group: "Seed", units: [] }, itemUnitId: null, unitFactor: 1, quantity: 50, unitPrice: 2, raft: null, supplierLotCode: null, seedLotCode: "PN000004-2", seedLot: null, seeded: 0, returned: 0, returnable: 50, discount: 0, netUnitPrice: 2, vatRateId: "KCT", vatRateName: "KCT", vatPercent: null, vatAmount: 0 },
  ],
  returns: [], ...patch,
});
const wrap = (node: React.ReactNode) => render(<ToastProvider>{node}</ToastProvider>);

beforeEach(() => {
  state.context.identity.subjectType = "CooperativeOwner";
  state.getReceipt.mockResolvedValue({ status: "success", data: receipt() });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("offers only seed items in the finder of the Nhập giống editor and sends the kind with a new receipt", async () => {
  state.saveReceipt.mockResolvedValue({ status: "success", data: receipt() });
  wrap(<ReceiptEditorPage kind="Seed" />);
  const finder = await screen.findByLabelText("Tìm giống theo mã hoặc tên");
  fireEvent.focus(finder);
  expect(screen.getByText("Hàu giống 3 cm")).toBeTruthy();
  expect(screen.queryByText("Phao nhựa")).toBeNull();
  expect(screen.queryByText("Dây thừng")).toBeNull();
  expect(screen.getByRole("heading", { name: "Nhập giống" })).toBeTruthy();
  fireEvent.click(screen.getByText("Hàu giống 3 cm"));
  expect(screen.getByRole("link", { name: "GG000001" }).getAttribute("href")).toBe("/inputs/seeds?code=GG000001");
});

it("offers Vật tư and Khác but no seed in the finder of the Nhập vật tư editor", async () => {
  wrap(<ReceiptEditorPage kind="Supply" />);
  const finder = await screen.findByLabelText("Tìm vật tư theo mã hoặc tên");
  fireEvent.focus(finder);
  expect(screen.getByText("Phao nhựa")).toBeTruthy();
  expect(screen.getByText("Dây thừng")).toBeTruthy();
  expect(screen.queryByText("Hàu giống 3 cm")).toBeNull();
  expect(screen.getByRole("heading", { name: "Nhập vật tư" })).toBeTruthy();
});

it("prefills a new line with the last purchase price of the item and keeps it editable", async () => {
  wrap(<ReceiptEditorPage kind="Supply" />);
  const finder = await screen.findByLabelText("Tìm vật tư theo mã hoặc tên");
  fireEvent.focus(finder);
  fireEvent.click(screen.getByText("Phao nhựa"));
  fireEvent.focus(finder);
  fireEvent.click(screen.getByText("Dây thừng"));
  const first = screen.getByLabelText("Đơn giá dòng 1") as HTMLInputElement, second = screen.getByLabelText("Đơn giá dòng 2") as HTMLInputElement;
  expect(first.value.replace(/\D/g, "")).toBe("1500");
  expect(second.value).toBe("");
  fireEvent.change(first, { target: { value: "1800" } });
  expect((screen.getByLabelText("Đơn giá dòng 1") as HTMLInputElement).value.replace(/\D/g, "")).toBe("1800");
});

it("starts a new receipt with the item of the catalogue only when it is of the kind of the screen", async () => {
  wrap(<ReceiptEditorPage kind="Supply" itemId={id(4)} />);
  await screen.findByLabelText("Tìm vật tư theo mã hoặc tên");
  expect(screen.queryByText("Hàu giống 3 cm")).toBeNull();
  expect(screen.getByText("Chưa có hàng trong phiếu")).toBeTruthy();
  cleanup();
  wrap(<ReceiptEditorPage kind="Seed" itemId={id(4)} />);
  expect(await screen.findByText("Hàu giống 3 cm")).toBeTruthy();
});

it("moves a receipt opened on the screen of the other kind to its own edit route", async () => {
  wrap(<ReceiptEditorPage kind="Supply" id={id(1)} />);
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith(`/operations/seed-receipts/${id(1)}/edit`));
});

const seedReturn = (): PurchaseReturn => ({
  id: id(2), code: "TH000001", kind: "Seed", date: "2026-11-12", returnedAt: "2026-11-12T08:00:00+07:00", rowVersion: "v1", receipt: { id: id(1), code: "PN000004" }, supplier: { id: id(8), code: "NCC000001", name: "Trại giống", phone: "" },
  zone: null, recordedBy: "Chủ", statusId: 1903, reason: "", discount: 0, value: 0, netValue: 0, refund: null, cancelReason: null, lines: [], vatRefund: 0,
});

it("starts a return from a seed lot with its receipt line at the quantity still returnable and the other lines empty", async () => {
  wrap(<ReturnEditorPage kind="Seed" receiptId={id(1)} lineId={lineId(1)} />);
  const first = await screen.findByLabelText("số lượng trả dòng 1");
  expect((first as HTMLInputElement).value).toBe("40");
  expect((screen.getByLabelText("số lượng trả dòng 2") as HTMLInputElement).value).toBe("");
  expect(screen.getByRole("heading", { name: "Trả giống nhập" })).toBeTruthy();
  expect(screen.getByText(/Từ phiếu nhập PN000004/)).toBeTruthy();
});

it("starts a return from a receipt with no quantity when no line is named, and ignores a line that is not on the receipt", async () => {
  wrap(<ReturnEditorPage kind="Seed" receiptId={id(1)} />);
  expect(((await screen.findByLabelText("số lượng trả dòng 1")) as HTMLInputElement).value).toBe("");
  cleanup();
  wrap(<ReturnEditorPage kind="Seed" receiptId={id(1)} lineId={lineId(9)} />);
  expect(((await screen.findByLabelText("số lượng trả dòng 1")) as HTMLInputElement).value).toBe("");
});

it("saves a return started from a lot with that line and quantity", async () => {
  state.saveReturn.mockResolvedValue({ status: "success", data: seedReturn() });
  wrap(<ReturnEditorPage kind="Seed" receiptId={id(1)} lineId={lineId(1)} />);
  await screen.findByLabelText("số lượng trả dòng 1");
  fireEvent.change(screen.getByLabelText("Lý do trả hàng"), { target: { value: "Giống yếu" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu tạm" }));
  await waitFor(() => expect(state.saveReturn).toHaveBeenCalled());
  expect(state.saveReturn.mock.calls[0][0]).toMatchObject({ receiptId: id(1), lines: [{ receiptLineId: lineId(1), quantity: 40, unitPrice: 1 }] });
  await waitFor(() => expect(state.push).toHaveBeenCalledWith("/operations/seed-returns?code=TH000001"));
});

it("moves a return for a receipt of the other kind to the screen of that kind with the line kept", async () => {
  state.getReceipt.mockResolvedValue({ status: "success", data: receipt({ kind: "Supply" }) });
  wrap(<ReturnEditorPage kind="Seed" receiptId={id(1)} lineId={lineId(1)} />);
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith(`/operations/supply-returns/new?receipt=${id(1)}&line=${lineId(1)}`));
});

it("offers only the items of its kind to a standalone return", async () => {
  wrap(<ReturnEditorPage kind="Supply" />);
  fireEvent.focus(await screen.findByLabelText("Tìm vật tư trả theo mã hoặc tên"));
  expect(within(document.body).getByText("Phao nhựa")).toBeTruthy();
  expect(within(document.body).queryByText("Hàu giống 3 cm")).toBeNull();
});
