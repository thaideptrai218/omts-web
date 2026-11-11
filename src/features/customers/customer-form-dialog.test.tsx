// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({ save: vi.fn(), setPhoto: vi.fn(), removePhoto: vi.fn() }));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), customerRepository: repo }));
vi.mock("@/features/cash-book/repository", () => ({ listBanks: vi.fn(async () => ({ status: "success", data: [{ bin: "970436", shortName: "Vietcombank", name: "Ngân hàng TMCP Ngoại thương" }] })) }));
import { CustomerFormDialog } from "./customer-form-dialog";
import { spread } from "./allocation";
import { ToastProvider } from "@/components/ui/toast-provider";

const record = { id: "122bb318-a72e-49aa-a8d7-a6169f889007", code: "KH000001", name: "Chú Ba", phoneNumber: "0900000000", email: "a@b.vn", address: "Ấp 1", note: null, phoneLocked: true, traderAccount: null, mergedIntoCustomerId: null, rowVersion: "v1",
  statusId: 101, status: "In Use", customerType: "Company", gender: "Male", birthDate: "1980-05-20", phoneNumber2: null, facebook: null, province: "Cần Thơ", ward: null, companyName: "Cty Ba", taxCode: "0312345678", identityNumber: "012345678901",
  bankBin: "970436", bankName: "Vietcombank", bankAccountNumber: "0011", photoUrl: null, createdAt: "2026-11-09T00:00:00Z", createdBy: "Chủ", isUsed: true, currentDebt: 0 };

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
  repo.save.mockResolvedValue({ status: "success", data: { customer: { ...record, name: "Chú Ba mới" } } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("sends every field when it edits, so that the replacing save clears nothing by accident, and locks the phone of a trader account", async () => {
  const user = userEvent.setup(), saved = vi.fn();
  render(<ToastProvider><CustomerFormDialog record={record} onClose={vi.fn()} onSaved={saved} /></ToastProvider>);
  expect((screen.getByLabelText("Số điện thoại 1 *") as HTMLInputElement).readOnly).toBe(true);
  const name = screen.getByLabelText("Tên khách hàng *");
  await user.clear(name); await user.type(name, "Chú Ba mới");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
    name: "Chú Ba mới", code: "KH000001", phoneNumber: "0900000000", email: "a@b.vn", birthDate: "1980-05-20", gender: "Male", customerType: "Company", companyName: "Cty Ba", taxCode: "0312345678",
    identityNumber: "012345678901", bankBin: "970436", bankAccountNumber: "0011", province: "Cần Thơ", phoneNumber2: null, facebook: null, rowVersion: "v1",
  }), record.id);
});

it("refuses a new customer without a name or phone before calling the API", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><CustomerFormDialog record={null} onClose={vi.fn()} onSaved={vi.fn()} /></ToastProvider>);
  await user.type(screen.getByLabelText("Tên khách hàng *"), "Anh Tư");
  // The browser would stop an empty required field itself; the form still checks when it is submitted by other means.
  fireEvent.submit(screen.getByLabelText("Tên khách hàng *").closest("form")!);
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(repo.save).not.toHaveBeenCalled();
});

it("marks the fields the settings require and asks for them before calling the API", async () => {
  const user = userEvent.setup();
  const required = { phoneNumber2: false, email: true, gender: false, birthDate: false, address: true, facebook: false, bank: false, taxCode: true };
  render(<ToastProvider><CustomerFormDialog record={null} required={required} onClose={vi.fn()} onSaved={vi.fn()} /></ToastProvider>);
  expect(screen.getByLabelText("Email *")).toBeTruthy();
  expect(screen.getByLabelText("Mã số thuế *")).toBeTruthy();
  expect(screen.getByLabelText("Tỉnh/thành *")).toBeTruthy();
  expect(screen.queryByLabelText("Facebook *")).toBeNull();
  await user.type(screen.getByLabelText("Tên khách hàng *"), "Anh Tư");
  await user.type(screen.getByLabelText("Số điện thoại 1 *"), "0911111111");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Nhập email.");
  expect(repo.save).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText("Email *"), "tu@b.vn");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Nhập địa chỉ.");
});

it("spreads a payment over the unpaid invoices oldest first", () => {
  const invoices = [{ id: "a", unpaid: 300 }, { id: "b", unpaid: 500 }].map((row) => ({ ...row, code: row.id, invoiceDate: "2026-11-01", total: row.unpaid, covered: 0, ageDays: 1 }));
  expect(spread(400, invoices)).toEqual({ a: 300, b: 100 });
  expect(spread(5000, invoices)).toEqual({ a: 300, b: 500 });
  expect(spread(0, invoices)).toEqual({ a: 0, b: 0 });
});

it("keeps a draft when discarding is declined and closes only after explicit consent", async () => {
  const user = userEvent.setup(), close = vi.fn();
  render(<ToastProvider><CustomerFormDialog record={null} onClose={close} onSaved={vi.fn()} /></ToastProvider>);
  await user.type(screen.getByLabelText("Tên khách hàng *"), "QA draft");
  await user.click(screen.getByRole("button", { name: "Bỏ qua" }));
  await user.click(await screen.findByRole("button", { name: "Quay lại" }));
  expect((screen.getByLabelText("Tên khách hàng *") as HTMLInputElement).value).toBe("QA draft");
  expect(close).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Bỏ qua" }));
  await user.click(await screen.findByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(close).toHaveBeenCalled());
});
