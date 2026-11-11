// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ priceSetup: vi.fn(), savePriceSetup: vi.fn() }));
vi.mock("@/features/input-items/repository", async (original) => ({ ...(await original<typeof import("@/features/input-items/repository")>()), inputRepository: state }));
import { PriceSetupDialog } from "./price-setup-dialog";
import { ToastProvider } from "@/components/ui/toast-provider";

const setup = {
  receiptId: "r1", receiptCode: "PN000001",
  lines: [
    { itemId: "i1", itemCode: "VT000001", itemName: "Phao nhựa", unit: "cái", receiptPrice: 11000, costPrice: 12000, lastPurchasePrice: 11000 },
    { itemId: "i2", itemCode: "VT000002", itemName: "Dây neo", unit: "cuộn", receiptPrice: 50000, costPrice: null, lastPurchasePrice: null },
  ],
};

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => {
  state.priceSetup.mockResolvedValue({ status: "success", data: setup });
  state.savePriceSetup.mockResolvedValue({ status: "success", data: setup });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("sends only the items whose cost was changed, then closes", async () => {
  const user = userEvent.setup(), onClose = vi.fn();
  render(<ToastProvider><PriceSetupDialog receiptId="r1" receiptCode="PN000001" onClose={onClose} /></ToastProvider>);
  const second = await screen.findByLabelText("Giá vốn dòng 2: Dây neo");
  expect(screen.getByRole("button", { name: "Lưu" }).hasAttribute("disabled")).toBe(true);
  await user.type(second, "52000");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.savePriceSetup).toHaveBeenCalledWith("r1", [{ itemId: "i2", costPrice: 52000 }]));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});

it("clears a cost left empty and refuses text that is not a number", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><PriceSetupDialog receiptId="r1" receiptCode="PN000001" onClose={vi.fn()} /></ToastProvider>);
  const first = await screen.findByLabelText("Giá vốn dòng 1: Phao nhựa");
  await user.clear(first);
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.savePriceSetup).toHaveBeenCalledWith("r1", [{ itemId: "i1", costPrice: null }]));
});
