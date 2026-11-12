// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ write: vi.fn(), all: vi.fn() }));
vi.mock("./repository", () => ({ readCycles: vi.fn(), writeCycle: state.write }));
vi.mock("@/features/products/repository", async (original) => ({ ...(await original<typeof import("@/features/products/repository")>()), productRepository: { all: state.all } }));
import { CycleEditor } from "./cycle-editor";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const product = (n: number, name: string, statusId = 101) => ({ id: id(n), code: `SP00000${n}`, name, unitPrice: 1000, statusId, status: "", rowVersion: "v", unit: "kg", units: [], createdAt: "x" });
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => {
  state.all.mockResolvedValue({ status: "success", data: [product(1, "Hàu sữa"), product(2, "Hàu béo"), product(3, "Hàu cũ", 102)] });
  state.write.mockResolvedValue({ status: "success", data: {} });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("will not start a cycle without the farmed product and sends it with the start", async () => {
  const onSaved = vi.fn();
  render(<CycleEditor raftId={id(9)} raftCode="B1-01" canCancel={false} onClose={vi.fn()} onSaved={onSaved} />);
  await waitFor(() => expect(screen.getByRole("option", { name: "Hàu béo (SP000002)" })).toBeTruthy());
  expect(screen.queryByRole("option", { name: /Hàu cũ/ })).toBeNull();

  await userEvent.click(screen.getByRole("button", { name: "Lưu chu kỳ" }));
  expect(screen.getByText("Chọn sản phẩm nuôi.")).toBeTruthy();
  expect(state.write).not.toHaveBeenCalled();

  await userEvent.selectOptions(screen.getByLabelText("Sản phẩm nuôi *"), id(2));
  await userEvent.click(screen.getByRole("button", { name: "Lưu chu kỳ" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(state.write).toHaveBeenCalledWith("start", id(9), expect.objectContaining({ productId: id(2) }));
});
