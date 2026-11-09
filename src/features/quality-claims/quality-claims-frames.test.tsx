// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ClaimReportScreen } from "./claim-report-screen";
import { QualityClaimsScreen } from "./quality-claims-screen";

const fetchSpy = vi.fn();
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => { fetchSpy.mockReset(); vi.stubGlobal("fetch", fetchSpy); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("ClaimReportScreen (frame)", () => {
  it("draws the form with the submit button disabled and makes no request", () => {
    render(<ClaimReportScreen />);
    expect(screen.getByRole("heading", { level: 1, name: "Báo vấn đề chất lượng" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Lô thu hoạch" })).toBeTruthy();
    expect(screen.getByText("Chưa có dữ liệu để hiển thị.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Gửi" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "+ Thêm ảnh" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Mô tả vấn đề/), { target: { value: "abc" } });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("QualityClaimsScreen (frame)", () => {
  it("draws filters, empty table and dialogs whose confirm buttons are disabled", () => {
    render(<QualityClaimsScreen />);
    expect(screen.getByRole("heading", { level: 1, name: "Khiếu nại chất lượng" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Mã khiếu nại" })).toBeTruthy();
    expect(screen.getAllByText("Chưa có dữ liệu để hiển thị.").length).toBeGreaterThan(0);
    expect(screen.getByRole("checkbox", { name: "Chờ phản hồi" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Chấp nhận" }));
    const accept = screen.getByRole("dialog", { name: "Chấp nhận khiếu nại" });
    expect((accept.querySelector("button[type=submit]") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
    expect(screen.queryByRole("dialog", { name: "Chấp nhận khiếu nại" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Từ chối" }));
    expect(screen.getByLabelText(/Lý do từ chối/)).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
