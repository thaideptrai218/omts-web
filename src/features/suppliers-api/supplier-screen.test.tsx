// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ context: { identity: { subjectType: "Staff" }, permissions: { functionPermissions: [] as { functionCode: string; action: string }[] } }, list: vi.fn(), detail: vi.fn() }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("./repository", () => ({ supplierRepository: { list: state.list, detail: state.detail, history: vi.fn(), bulk: vi.fn(), download: vi.fn(), save: vi.fn(), setStatus: vi.fn(), import: vi.fn() } }));
vi.mock("@/features/purchasing-v2/screens", () => ({ ReceiptDialog: () => null, SupplierPaymentDialog: () => null }));
vi.mock("@/features/supplier-api/documents-dialog", () => ({ SupplierDocumentsDialog: () => null }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
import { SupplierScreen } from "./supplier-screen";

const row = { id: "122bb318-a72e-49aa-a8d7-a6169f889007", name: "Trại giống", code: "NCC000001", supplierType: "Seed", phoneNumber: "0900000000", statusId: 101, status: "In Use", email: null, address: null, province: null, ward: null, companyName: null, taxCode: null, note: null, createdAt: "2026-11-09T00:00:00Z", createdBy: "Chủ", totalPurchased: 100000, currentDebt: null };
const grant = (...pairs: [string, string][]) => { state.context.permissions.functionPermissions = pairs.map(([functionCode, action]) => ({ functionCode, action })); };

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* storage may be unavailable */ }
  state.list.mockResolvedValue({ status: "success", data: { items: [row], page: 1, pageSize: 15, total: 1 } });
  state.detail.mockResolvedValue({ status: "success", data: { ...row, identityNumber: null, certificates: [], rowVersion: "v" } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("hides debt column and filter without SUPPLIER_PAYMENTS and never sends debt parameters", async () => {
  grant(["SUPPLIERS", "View"], ["PURCHASE_RECEIPTS", "View"]);
  render(<SupplierScreen />);
  await screen.findByText("Trại giống");
  expect(screen.queryByRole("button", { name: "Nợ hiện tại" })).toBeNull();
  expect(screen.queryByLabelText("Nợ hiện tại từ")).toBeNull();
  expect(screen.getByRole("button", { name: "Tổng mua" })).toBeTruthy();
  expect(Object.keys(state.list.mock.calls[0][0])).not.toContain("currentDebtFrom");
});

it("opens a row on click, not on its checkbox, and shows no debt tab without the permission", async () => {
  grant(["SUPPLIERS", "View"], ["SUPPLIERS", "Edit"]);
  const user = userEvent.setup();
  render(<SupplierScreen />);
  const name = await screen.findByText("Trại giống");
  await user.click(screen.getByRole("checkbox", { name: "Chọn Trại giống" }));
  expect(screen.queryByRole("tablist")).toBeNull();
  await user.click(name);
  await waitFor(() => expect(screen.getByRole("tablist")).toBeTruthy());
  expect(screen.queryByRole("tab", { name: "Nợ cần trả nhà cung cấp" })).toBeNull();
});

it("remembers a closed filter rail and offers a named control to reopen it", async () => {
  grant(["SUPPLIERS", "View"]);
  const user = userEvent.setup();
  render(<SupplierScreen />);
  await screen.findByText("Trại giống");
  await user.click(screen.getByRole("button", { name: "Ẩn bộ lọc" }));
  expect(screen.getByRole("button", { name: "Hiện bộ lọc" })).toBeTruthy();
  cleanup();
  render(<SupplierScreen />);
  await screen.findByText("Trại giống");
  expect(screen.getByRole("button", { name: "Hiện bộ lọc" })).toBeTruthy();
});
