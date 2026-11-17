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
const saved = { id: id(1), code: "GG000001", name: "Hàu giống", group: "Seed", unit: "cái", units: [], onHand: 0, stockValue: 0, statusId: 101, status: "In Use", createdAt: "2026-11-10T00:00:00+07:00", rowVersion: "v1" };

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
  repo.groups.mockResolvedValue({ status: "success", data: [] });
  repo.units.mockResolvedValue({ status: "success", data: [unit(3, "cái"), unit(5, "thùng")] });
  repo.nextCode.mockResolvedValue({ status: "success", data: { code: "GG000001" } });
  repo.save.mockResolvedValue({ status: "success", data: saved });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const open = async (props: Partial<Parameters<typeof ItemFormDialog>[0]> = {}) => {
  const onSaved = vi.fn(), user = userEvent.setup();
  render(<ToastProvider><ItemFormDialog record={null} copy={false} onClose={vi.fn()} onSaved={onSaved} {...props} /></ToastProvider>);
  await waitFor(() => expect(within(screen.getByLabelText("Đơn vị cơ bản")).getAllByRole("option").length).toBeGreaterThan(1));
  return { user, onSaved };
};

it("refuses a seed item without a loại hàu bán ra and calls the API once one is chosen, showing the product as a link", async () => {
  repo.products.mockResolvedValue({ status: "success", data: [{ id: id(7), code: "SP000001", name: "Hàu béo" }] });
  const { user, onSaved } = await open({ kind: "Seed" });
  await user.type(screen.getByLabelText("Tên hàng *"), "Hàu giống 3 cm");
  await user.selectOptions(screen.getByLabelText("Đơn vị cơ bản"), id(3));
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  expect((await screen.findByRole("alert")).textContent).toMatch(/loại hàu bán ra/);
  expect(repo.save).not.toHaveBeenCalled();
  const select = await screen.findByLabelText(/^Loại hàu bán ra/);
  await waitFor(() => expect(within(select).getAllByRole("option")).toHaveLength(2));
  await user.selectOptions(select, id(7));
  expect(screen.getByRole("link", { name: "Hàu béo (SP000001)" }).getAttribute("href")).toBe("/sales/products?code=SP000001");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ group: "Seed", productId: id(7) }), undefined);
});

it("fixes the type of a Giống form to Seed", async () => {
  repo.products.mockResolvedValue({ status: "success", data: [] });
  await open({ kind: "Seed" });
  const type = screen.getByLabelText("Loại hàng") as HTMLSelectElement;
  expect(type.disabled).toBe(true);
  expect(within(type).getAllByRole("option").map((option) => option.textContent)).toEqual(["Giống"]);
  expect(screen.getByText("Tạo giống")).toBeTruthy();
});

it("offers only Vật tư and Khác on a Vật tư form, with no product field", async () => {
  await open({ kind: "Supply" });
  const type = screen.getByLabelText("Loại hàng") as HTMLSelectElement;
  expect(within(type).getAllByRole("option").map((option) => option.textContent)).toEqual(["Vật tư", "Khác"]);
  expect(type.value).toBe("Material");
  expect(screen.queryByLabelText(/^Loại hàu bán ra/)).toBeNull();
  expect(screen.getByText("Tạo vật tư")).toBeTruthy();
});
