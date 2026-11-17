// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({ save: vi.fn(), products: vi.fn(), groups: vi.fn(), units: vi.fn(), nextCode: vi.fn(), saveGroup: vi.fn(), saveUnit: vi.fn(), addPhoto: vi.fn(), removePhoto: vi.fn() }));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), inputRepository: repo }));
import { ItemFormDialog } from "./item-form-dialog";
import { ToastProvider } from "@/components/ui/toast-provider";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const unit = (n: number, name: string) => ({ id: id(n), name, itemCount: 0, isUsed: false, rowVersion: "v" });
const saved = { id: id(1), code: "VT000001", name: "Phao nhựa", group: "Material", unit: "cái", units: [], onHand: 0, stockValue: 0, statusId: 101, status: "In Use", createdAt: "2026-11-10T00:00:00+07:00", rowVersion: "v1" };

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
  repo.groups.mockResolvedValue({ status: "success", data: [] });
  repo.units.mockResolvedValue({ status: "success", data: [unit(3, "cái"), unit(5, "thùng")] });
  repo.nextCode.mockResolvedValue({ status: "success", data: { code: "VT000001" } });
  repo.save.mockResolvedValue({ status: "success", data: saved });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const open = async (props: Partial<Parameters<typeof ItemFormDialog>[0]> = {}) => {
  const onSaved = vi.fn(), user = userEvent.setup();
  render(<ToastProvider><ItemFormDialog record={null} copy={false} onClose={vi.fn()} onSaved={onSaved} {...props} /></ToastProvider>);
  await waitFor(() => expect(within(screen.getByLabelText("Đơn vị cơ bản")).getAllByRole("option").length).toBeGreaterThan(1));
  return { user, onSaved };
};

it("saves a new item with its base unit and a second unit as a multiple of the base", async () => {
  const { user, onSaved } = await open();
  await user.type(screen.getByLabelText("Tên hàng *"), "Phao nhựa");
  await user.selectOptions(screen.getByLabelText("Đơn vị cơ bản"), id(3));
  await user.click(screen.getByRole("button", { name: "+ Thêm đơn vị" }));
  await user.selectOptions(screen.getByLabelText("Đơn vị 2"), id(5));
  await user.type(screen.getByLabelText("Quy đổi đơn vị 2"), "12");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved, false));
  expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
    name: "Phao nhựa", group: "Material", code: null, itemGroupId: null,
    units: [{ id: null, unitId: id(3), factor: 1, code: null, isBase: true }, { id: null, unitId: id(5), factor: 12, code: null, isBase: false }],
  }), undefined);
});

it("offers the loại hàu bán ra only for a seed item, reads the products once, and sends the choice", async () => {
  repo.products.mockResolvedValue({ status: "success", data: [{ id: id(7), name: "Hàu béo" }, { id: id(8), name: "Hàu sữa" }] });
  const { user, onSaved } = await open();
  expect(screen.queryByLabelText("Loại hàu bán ra")).toBeNull(); expect(repo.products).not.toHaveBeenCalled();
  await user.selectOptions(screen.getByLabelText("Loại hàng"), "Seed");
  const select = await screen.findByLabelText("Loại hàu bán ra");
  await waitFor(() => expect(within(select).getAllByRole("option")).toHaveLength(3));
  expect(screen.getByText("Chọn loại hàu mà giống này nuôi ra. Đơn mua của khách phải khớp loại hàu này khi thu hoạch.")).toBeTruthy();
  expect(repo.products).toHaveBeenCalledTimes(1);
  await user.type(screen.getByLabelText("Tên hàng *"), "Hàu giống 3 cm");
  await user.selectOptions(screen.getByLabelText("Đơn vị cơ bản"), id(3));
  await user.selectOptions(select, id(7));
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ group: "Seed", productId: id(7) }), undefined);
  // Back to another group: the field goes away and the body clears the link.
  await user.selectOptions(screen.getByLabelText("Loại hàng"), "Material");
  expect(screen.queryByLabelText("Loại hàu bán ra")).toBeNull();
});

it("refuses a maximum below the minimum before calling the API", async () => {
  const { user } = await open();
  await user.type(screen.getByLabelText("Tên hàng *"), "Phao nhựa");
  await user.type(screen.getByLabelText("Định mức tối thiểu"), "10");
  await user.type(screen.getByLabelText("Định mức tối đa"), "5");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  expect((await screen.findByRole("alert")).textContent).toMatch(/Định mức tối đa/);
  expect(repo.save).not.toHaveBeenCalled();
});

it("keeps the form open and empty for the next item on Lưu & Tạo thêm", async () => {
  const { user, onSaved } = await open();
  await user.type(screen.getByLabelText("Tên hàng *"), "Phao nhựa");
  await user.selectOptions(screen.getByLabelText("Đơn vị cơ bản"), id(3));
  await user.click(screen.getByRole("button", { name: "Lưu & Tạo thêm" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved, true));
  await waitFor(() => expect((screen.getByLabelText("Tên hàng *") as HTMLInputElement).value).toBe(""));
});

it("shows the reason of a refused save inside the form and keeps what was typed", async () => {
  repo.save.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-GEN-02", uncertain: false, problem: { field: "Code" } });
  const { user, onSaved } = await open();
  await user.type(screen.getByLabelText("Tên hàng *"), "Phao nhựa");
  await user.selectOptions(screen.getByLabelText("Đơn vị cơ bản"), id(3));
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  expect((await screen.findByRole("alert")).textContent).toMatch(/Kiểm tra: Mã/);
  expect(onSaved).not.toHaveBeenCalled();
  expect((screen.getByLabelText("Tên hàng *") as HTMLInputElement).value).toBe("Phao nhựa");
});
