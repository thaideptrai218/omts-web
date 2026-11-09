// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { PayrollPaymentsScreen } from "./payroll-payments-screen";
import { PayrollScreen } from "./payroll-screen";

const fetchSpy = vi.fn();

beforeAll(() => {
  // jsdom has no <dialog> modal API.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
beforeEach(() => { vi.stubGlobal("fetch", fetchSpy); });
afterEach(() => { cleanup(); fetchSpy.mockClear(); vi.unstubAllGlobals(); });

it("renders the payroll sheet frame with disabled API actions and no request", () => {
  render(<PayrollScreen />);
  expect(screen.getByRole("heading", { level: 1, name: "Bảng lương" })).toBeTruthy();
  expect(screen.getByRole("columnheader", { name: "Tổng lương (₫)" })).toBeTruthy();
  for (const tab of ["Thông tin", "Phiếu lương", "Chi phí nhân công", "Lịch sử thanh toán"]) expect(screen.getByRole("tab", { name: tab })).toBeTruthy();
  expect(screen.getAllByText("Chưa có dữ liệu để hiển thị.").length).toBeGreaterThan(0);
  const send = screen.getAllByRole("button", { name: "Gửi cho chủ hợp tác xã" });
  expect(send.every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("opens the create dialog with a disabled confirm button and closes it with Bỏ qua", () => {
  render(<PayrollScreen />);
  fireEvent.click(screen.getByRole("button", { name: "+ Tạo bảng lương" }));
  const dialog = screen.getByRole("dialog", { hidden: true });
  expect((within(dialog).getByRole("button", { name: "Tạo bảng lương", hidden: true }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(within(dialog).getByRole("button", { name: "Bỏ qua", hidden: true }));
  expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("renders the payroll payment frame with disabled record button and no request", () => {
  render(<PayrollPaymentsScreen />);
  expect(screen.getByRole("heading", { level: 1, name: "Thanh toán lương" })).toBeTruthy();
  expect(screen.getByRole("columnheader", { name: "Còn nợ (₫)" })).toBeTruthy();
  expect(screen.getByText("Chưa có dữ liệu để hiển thị.")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Ghi nhận thanh toán" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("radio", { name: "Chuyển khoản" }));
  expect(screen.getByLabelText(/Mã tham chiếu ngân hàng.*\*/)).toBeTruthy();
  expect(fetchSpy).not.toHaveBeenCalled();
});
