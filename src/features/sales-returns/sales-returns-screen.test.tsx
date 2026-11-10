// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SalesReturnsScreen } from "./sales-returns-screen";

const fetchSpy = vi.fn();
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => { fetchSpy.mockReset(); vi.stubGlobal("fetch", fetchSpy); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("SalesReturnsScreen (frame)", () => {
  it("draws the return form; the confirm action stays disabled and nothing is requested", () => {
    render(<SalesReturnsScreen />);
    expect(screen.getByRole("heading", { level: 1, name: "Phiếu trả hàng bán" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Hàu trả lại được xử lý" })).toBeTruthy();
    expect(screen.getAllByText("Chưa có dữ liệu để hiển thị.").length).toBe(2);
    expect(screen.getByLabelText(/Lý do trả hàng/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Lưu phiếu trả hàng" }));
    const dialog = screen.getByRole("dialog", { name: "Xác nhận phiếu trả hàng bán" });
    expect((dialog.querySelector("button[disabled]") as HTMLButtonElement).textContent).toBe("Có");
    fireEvent.click(screen.getByRole("button", { name: "Không" }));
    expect(screen.queryByRole("dialog", { name: "Xác nhận phiếu trả hàng bán" })).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
