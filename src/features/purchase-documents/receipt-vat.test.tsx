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
  usePurchaseLookups: () => ({
    suppliers: [{ id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b08", code: "NCC000001", name: "Trại giống", phone: "" }], rafts: [], receivers: [], loading: false, refresh: vi.fn(),
    items: [
      { id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b04", code: "GG000001", name: "Hàu giống 3 cm", unit: "mảnh", group: "Seed", purchaseVatRate: "KCT", basePrice: 1000, units: [{ id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b11", name: "mảnh", factor: 1, code: "GG-M", isBase: true }] },
      { id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b05", code: "VT000001", name: "Phao nhựa", unit: "cái", group: "Material", purchaseVatRate: "10", basePrice: 100000, units: [{ id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b12", name: "cái", factor: 1, code: "VT-C", isBase: true }] },
      { id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b06", code: "VT000002", name: "Dây thừng", unit: "cuộn", group: "Other", purchaseVatRate: null, basePrice: 50000, units: [{ id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b13", name: "cuộn", factor: 1, code: "VT-D", isBase: true }] },
    ],
  }),
}));
import { ReceiptEditorPage } from "./receipt-editor";
import { ReturnEditorPage } from "./return-editor";
import { InfoTab } from "./receipt-detail";
import { receiptView } from "./contracts";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { PurchaseReturn, Receipt, ReceiptLine } from "./types";

const id = (n: number) => `0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0${n}`;
const lineId = (n: number) => `0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d1b0${n}`;
const phao = { id: id(5), code: "VT000001", name: "Phao nhựa", unit: "cái", group: "Material" as const, units: [] };
const line = (patch: Partial<ReceiptLine> = {}): ReceiptLine => ({ id: lineId(1), item: phao, itemUnitId: null, unitFactor: 1, quantity: 1, unitPrice: 100000, raft: null, supplierLotCode: null, seedLotCode: null, seedLot: null, seeded: 0, returned: 0, returnable: 1, discount: 0, netUnitPrice: 100000, vatRate: "10", vatAmount: 10000, ...patch });
const receipt = (patch: Partial<Receipt> = {}): Receipt => ({
  id: id(1), code: "PN000007", kind: "Supply", seedState: null, date: "2026-11-28", receivedAt: "2026-11-28T08:00:00+07:00", receivedBy: null, completedAt: "2026-11-28T08:00:00+07:00", rowVersion: "v1",
  supplier: { id: id(8), code: "NCC000001", name: "Trại giống", phone: "" }, zone: null, recordedBy: "Chủ", statusId: 1702, discount: 0, payable: 110000, paid: 0, notes: null, vatTotal: 10000, cancelReason: null,
  lines: [line()], returns: [], ...patch,
});
const wrap = (node: React.ReactNode) => render(<ToastProvider>{node}</ToastProvider>);
/** The text of an aside or totals row by its label: "Cần trả nhà cung cấp110.000". */
const rowText = (label: string) => screen.getByText(label).parentElement!.textContent;

beforeEach(() => { state.context.identity.subjectType = "CooperativeOwner"; });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function pickSupplier() {
  fireEvent.focus(screen.getByLabelText("Tìm nhà cung cấp"));
  fireEvent.click(screen.getByText("Trại giống"));
}

async function addPhao() {
  const finder = await screen.findByLabelText("Tìm vật tư theo mã hoặc tên");
  fireEvent.focus(finder);
  fireEvent.click(screen.getByText("Phao nhựa"));
}

it("prefills the VAT of a new line from the item and adds it to what is owed: 100.000 at 10% is 110.000", async () => {
  wrap(<ReceiptEditorPage kind="Supply" />);
  await addPhao();
  expect((screen.getByLabelText("VAT dòng 1") as HTMLSelectElement).value).toBe("10");
  expect(screen.getByRole("columnheader", { name: "VAT (%)" })).toBeTruthy();
  expect(rowText("Tổng tiền hàng (1)")).toContain("100.000");
  expect(rowText("Thuế GTGT")).toContain("10.000");
  expect(rowText("Cần trả nhà cung cấp")).toContain("110.000");
  // The row sits between the discount and what is owed.
  const labels = Array.from(document.querySelectorAll("aside > div > div > span:first-child")).map((node) => node.textContent);
  expect(labels.indexOf("Thuế GTGT")).toBe(labels.indexOf("Giảm giá") + 1);
  expect(labels.indexOf("Cần trả nhà cung cấp")).toBe(labels.indexOf("Thuế GTGT") + 1);
});

it("takes VAT after the receipt discount: 10.000 off 100.000 gives VAT 9.000 and 99.000 to pay", async () => {
  wrap(<ReceiptEditorPage kind="Supply" />);
  await addPhao();
  fireEvent.change(screen.getByLabelText("Giảm giá phiếu (VND)"), { target: { value: "10000" } });
  expect(rowText("Thuế GTGT")).toContain("9.000");
  expect(rowText("Cần trả nhà cung cấp")).toContain("99.000");
});

it("follows the rate changed on the line, and sends it with the save", async () => {
  state.saveReceipt.mockResolvedValue({ status: "success", data: receipt() });
  wrap(<ReceiptEditorPage kind="Supply" />);
  await addPhao();
  fireEvent.change(screen.getByLabelText("VAT dòng 1"), { target: { value: "8" } });
  expect(rowText("Thuế GTGT")).toContain("8.000");
  expect(rowText("Cần trả nhà cung cấp")).toContain("108.000");
  fireEvent.change(screen.getByLabelText("VAT dòng 1"), { target: { value: "KCT" } });
  expect(rowText("Thuế GTGT")).toContain("0");
  expect(rowText("Cần trả nhà cung cấp")).toContain("100.000");
  fireEvent.change(screen.getByLabelText("VAT dòng 1"), { target: { value: "5" } });
  pickSupplier();
  fireEvent.click(screen.getByRole("button", { name: "Lưu tạm" }));
  await waitFor(() => expect(state.saveReceipt).toHaveBeenCalled());
  expect(state.saveReceipt.mock.calls[0][0].lines[0]).toMatchObject({ itemId: id(5), vatRate: "5" });
});

it("leaves a line of an item with no rate without one (shown as a dash, VAT 0) until a rate is picked", async () => {
  wrap(<ReceiptEditorPage kind="Supply" />);
  const finder = await screen.findByLabelText("Tìm vật tư theo mã hoặc tên");
  fireEvent.focus(finder);
  fireEvent.click(screen.getByText("Dây thừng"));
  const select = screen.getByLabelText("VAT dòng 1") as HTMLSelectElement;
  expect(select.value).toBe("");
  expect(rowText("Thuế GTGT")).toContain("0");
  fireEvent.change(select, { target: { value: "10" } });
  expect(rowText("Thuế GTGT")).toContain("5.000");
});

it("shows a seed receipt with no VAT column and the row Thuế GTGT: KCT, the total unchanged", async () => {
  wrap(<ReceiptEditorPage kind="Seed" />);
  const finder = await screen.findByLabelText("Tìm giống theo mã hoặc tên");
  fireEvent.focus(finder);
  fireEvent.click(screen.getByText("Hàu giống 3 cm"));
  pickSupplier();
  expect(screen.queryByRole("columnheader", { name: "VAT (%)" })).toBeNull();
  expect(screen.queryByLabelText("VAT dòng 1")).toBeNull();
  expect(rowText("Thuế GTGT")).toContain("KCT");
  expect(rowText("Cần trả nhà cung cấp")).toContain("1.000");
  state.saveReceipt.mockResolvedValue({ status: "success", data: receipt({ kind: "Seed" }) });
  fireEvent.click(screen.getByRole("button", { name: "Lưu tạm" }));
  await waitFor(() => expect(state.saveReceipt).toHaveBeenCalled());
  expect(state.saveReceipt.mock.calls[0][0].lines[0].vatRate).toBeNull();
});

it("edits a completed receipt with the rate of its lines and tells the change of debt including VAT", async () => {
  state.getReceipt.mockResolvedValue({ status: "success", data: receipt() });
  wrap(<ReceiptEditorPage kind="Supply" id={id(1)} />);
  expect(((await screen.findByLabelText("VAT dòng 1")) as HTMLSelectElement).value).toBe("10");
  expect(rowText("Cần trả nhà cung cấp")).toContain("110.000");
  expect(screen.queryByText("Chênh lệch công nợ")).toBeNull();
  fireEvent.change(screen.getByLabelText("VAT dòng 1"), { target: { value: "8" } });
  expect(rowText("Chênh lệch công nợ")).toContain("−2.000");
});

it("shows the VAT of each line of a receipt, a dash for a line made before input VAT, and the VAT total above what is owed", () => {
  const old = line({ id: lineId(2), vatRate: null, vatAmount: 0, item: { ...phao, id: id(6), code: "VT000002", name: "Dây thừng" } });
  render(<InfoTab receipt={receipt({ lines: [line(), old], vatTotal: 10000, payable: 110000 + 100000 })} editable={false} onHeader={() => undefined} header={{ receivedById: "", receivedAt: "2026-11-28T08:00", notes: "" }} />);
  expect(screen.getByRole("columnheader", { name: "VAT (%)" })).toBeTruthy();
  expect(within(screen.getByText("Phao nhựa").closest("tr")!).getByText("10%")).toBeTruthy();
  expect(within(screen.getByText("Dây thừng").closest("tr")!).getByText("—")).toBeTruthy();
  expect(rowText("Thuế GTGT")).toContain("10.000");
});

it("shows Thuế GTGT: KCT on the totals of a seed receipt", () => {
  render(<InfoTab receipt={receipt({ kind: "Seed", vatTotal: 0, payable: 100000, lines: [line({ vatRate: "KCT", vatAmount: 0 })] })} editable={false} onHeader={() => undefined} header={{ receivedById: "", receivedAt: "2026-11-28T08:00", notes: "" }} />);
  expect(rowText("Thuế GTGT")).toContain("KCT");
});

const supplyReturn = (): PurchaseReturn => ({
  id: id(2), code: "TH000002", kind: "Supply", date: "2026-11-28", returnedAt: "2026-11-28T08:00:00+07:00", rowVersion: "v1", receipt: { id: id(1), code: "PN000007" }, supplier: { id: id(8), code: "NCC000001", name: "Trại giống", phone: "" },
  zone: null, recordedBy: "Chủ", statusId: 1903, reason: "", discount: 0, value: 0, netValue: 0, refund: null, cancelReason: null, lines: [], vatRefund: 0,
});

it("returns the phao at the rate of its receipt line: VAT hoàn lại 10.000 and 110.000 owed back by the supplier", async () => {
  state.getReceipt.mockResolvedValue({ status: "success", data: receipt() });
  wrap(<ReturnEditorPage kind="Supply" receiptId={id(1)} />);
  expect(await screen.findByRole("columnheader", { name: "VAT (%)" })).toBeTruthy();
  expect(within(screen.getByText("Phao nhựa").closest("tr")!).getByText("10%")).toBeTruthy();
  expect(rowText("Thuế GTGT hoàn lại")).toContain("0");
  fireEvent.change(screen.getByLabelText("số lượng trả dòng 1"), { target: { value: "1" } });
  expect(rowText("Thuế GTGT hoàn lại")).toContain("10.000");
  expect(rowText("Nhà cung cấp cần trả")).toContain("110.000");
  state.saveReturn.mockResolvedValue({ status: "success", data: supplyReturn() });
  fireEvent.change(screen.getByLabelText("Lý do trả hàng"), { target: { value: "Hỏng" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu tạm" }));
  await waitFor(() => expect(state.saveReturn).toHaveBeenCalled());
  expect(state.saveReturn.mock.calls[0][0].lines[0]).toMatchObject({ receiptLineId: lineId(1), quantity: 1, unitPrice: 100000 });
});

it("starts a standalone return with no VAT column and nothing to refund (its lines later take the item VAT mua vào)", async () => {
  wrap(<ReturnEditorPage kind="Supply" />);
  await screen.findByLabelText("Tìm vật tư trả theo mã hoặc tên");
  expect(screen.queryByRole("columnheader", { name: "VAT (%)" })).toBeNull();
  expect(rowText("Thuế GTGT hoàn lại")).toContain("0");
});

it("shows Thuế GTGT hoàn lại: KCT on the return of a seed", async () => {
  state.getReceipt.mockResolvedValue({ status: "success", data: receipt({ kind: "Seed", lines: [line({ item: { ...phao, group: "Seed" }, vatRate: "KCT", vatAmount: 0 })] }) });
  wrap(<ReturnEditorPage kind="Seed" receiptId={id(1)} />);
  await screen.findByLabelText("số lượng trả dòng 1");
  expect(rowText("Thuế GTGT hoàn lại")).toContain("KCT");
});

it("reads a receipt and a return from an API without input VAT: no rate, no amount, nothing fails", () => {
  const base = { id: id(1), code: "PN000001", supplier: { id: id(8), name: "NCC", phoneNumber: "" }, receiptDate: "2026-11-01", total: 100, returned: 0, statusId: 1702, status: "Completed", recordedBy: { id: id(9), name: "Chủ" }, rowVersion: "v", discount: 0, payable: 100, paid: 0, returns: [] };
  const row = { id: lineId(1), lineNumber: 1, unit: "cái", seeded: 0, returnedQuantity: 0, returnable: 1 };
  const parsed = receiptView.parse({ ...base, lines: [row] });
  expect(parsed.vatTotal).toBeUndefined();
  expect(parsed.lines[0].vatRate ?? null).toBeNull();
  expect(receiptView.parse({ ...base, lines: [{ ...row, vatRate: "KCT", vatAmount: 0 }], vatTotal: 0 }).lines[0].vatRate).toBe("KCT");
});
