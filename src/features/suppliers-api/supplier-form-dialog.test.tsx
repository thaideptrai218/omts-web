// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("./repository", () => ({ supplierRepository: repo }));
vi.mock("@/features/address-invoice/repository", async (original) => ({
  ...(await original<typeof import("@/features/address-invoice/repository")>()),
  addressRepository: {
    provinces: vi.fn(async () => ({ status: "success", data: [{ code: 92, name: "Thành phố Cần Thơ" }] })),
    wards: vi.fn(async () => ({ status: "success", data: [{ code: 920101, name: "Phường Ninh Kiều", provinceCode: 92 }] })),
    lookupTaxCode: vi.fn(),
  },
}));
import { SupplierFormDialog } from "./supplier-form-dialog";

const record = { id: "122bb318-a72e-49aa-a8d7-a6169f889007", name: "Trại giống Ba", code: "NCC000001", supplierType: "Seed" as const, phoneNumber: "0900000000", statusId: 101, status: "In Use", email: null, address: "Ấp 1",
  province: "Can Tho", ward: "Ninh Kieu", companyName: "Cty Ba", taxCode: "0312345678", note: null, createdAt: "2026-11-09T00:00:00Z", createdBy: null, certificates: [], rowVersion: "v1", addressNeedsReview: true };

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
  repo.save.mockResolvedValue({ status: "success", data: record });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("has no consumer buyer and no CCCD field, and asks for an individual's name and address before calling the API", async () => {
  const user = userEvent.setup();
  render(<SupplierFormDialog record={null} onClose={vi.fn()} onSaved={vi.fn()} />);
  expect(screen.getAllByRole("radio").map((radio) => (radio.closest("label") as HTMLElement).textContent)).toEqual(["Doanh nghiệp / Tổ chức", "Cá nhân"]);
  expect(screen.queryByText(/CCCD/)).toBeNull();
  await user.type(screen.getByLabelText("Tên nhà cung cấp *"), "Trại giống Ba");
  await user.type(screen.getByLabelText("Điện thoại *"), "0900000000");
  fireEvent.change(screen.getByRole("combobox", { name: "Nhóm *" }), { target: { value: "Seed" } });
  // A new supplier starts as an individual buyer, whose name is still to be given.
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Nhập họ tên người mua hóa đơn.");
  expect(repo.save).not.toHaveBeenCalled();
});

it("saves the contact address with its codes and an organisation's invoice info", async () => {
  const user = userEvent.setup(), saved = vi.fn();
  render(<SupplierFormDialog record={null} onClose={vi.fn()} onSaved={saved} />);
  await user.type(screen.getByLabelText("Tên nhà cung cấp *"), "Trại giống Ba");
  await user.type(screen.getByLabelText("Điện thoại *"), "0900000000");
  fireEvent.change(screen.getByRole("combobox", { name: "Nhóm *" }), { target: { value: "Seed" } });
  await waitFor(() => expect((screen.getByRole("combobox", { name: "Tỉnh/thành" }) as HTMLSelectElement).disabled).toBe(false));
  fireEvent.change(screen.getByRole("combobox", { name: "Tỉnh/thành" }), { target: { value: "92" } });
  await waitFor(() => expect((screen.getByRole("combobox", { name: "Phường/xã" }) as HTMLSelectElement).disabled).toBe(false));
  fireEvent.change(screen.getByRole("combobox", { name: "Phường/xã" }), { target: { value: "920101" } });
  await user.type(screen.getByLabelText("Số nhà, đường"), "12 Trần Hưng Đạo");
  await user.click(screen.getByRole("radio", { name: "Doanh nghiệp / Tổ chức" }));
  await user.type(screen.getByLabelText("Tên đơn vị *"), "Cty Giống Ba");
  await user.type(screen.getByLabelText("Mã số thuế *"), "0312345678");
  await user.type(screen.getByLabelText("Email nhận hóa đơn điện tử *"), "hoadon@ba.vn");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
    name: "Trại giống Ba", supplierType: "Seed", provinceCode: 92, provinceName: "Thành phố Cần Thơ", wardCode: 920101, wardName: "Phường Ninh Kiều", street: "12 Trần Hưng Đạo",
    province: "Thành phố Cần Thơ", ward: "Phường Ninh Kiều", address: "12 Trần Hưng Đạo",
    invoiceBuyerType: "Organization", invoiceName: "Cty Giống Ba", taxCode: "0312345678", personalTaxId: null, invoiceAddressSameAsContact: true, invoiceEmail: "hoadon@ba.vn",
  }), undefined);
  expect(repo.save.mock.calls[0][0]).not.toHaveProperty("identityNumber");
});

it("edits an old record in place, in the open row, keeps its old address text and asks to pick it again", async () => {
  const user = userEvent.setup(), saved = vi.fn();
  const { container } = render(<SupplierFormDialog inline record={{ ...record, invoiceBuyerType: "Organization", invoiceName: "Cty Ba", invoiceAddressSameAsContact: true, invoiceEmail: "hoadon@ba.vn" }} onClose={vi.fn()} onSaved={saved} />);
  expect(container.querySelector("dialog")).toBeNull();
  expect(screen.getByText("Địa chỉ cũ chưa khớp danh mục mới — chọn lại")).toBeTruthy();
  const name = screen.getByLabelText("Tên nhà cung cấp *");
  await user.clear(name); await user.type(name, "Trại giống Ba mới");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
    name: "Trại giống Ba mới", provinceCode: null, provinceName: "Can Tho", wardCode: null, wardName: "Ninh Kieu", street: "Ấp 1", rowVersion: "v1",
  }), record.id);
});

it("keeps a draft when discarding is declined", async () => {
  const user = userEvent.setup(), close = vi.fn();
  render(<SupplierFormDialog record={null} onClose={close} onSaved={vi.fn()} />);
  await user.type(screen.getByLabelText("Tên nhà cung cấp *"), "Nháp");
  await user.click(screen.getByRole("button", { name: "Bỏ qua" }));
  await user.click(await screen.findByRole("button", { name: "Quay lại" }));
  expect((screen.getByLabelText("Tên nhà cung cấp *") as HTMLInputElement).value).toBe("Nháp");
  expect(close).not.toHaveBeenCalled();
});
