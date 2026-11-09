// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SalesInvoiceListScreen } from "./invoice-list-screen";

const fetchSpy = vi.fn();
beforeEach(() => { fetchSpy.mockReset(); vi.stubGlobal("fetch", fetchSpy); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("SalesInvoiceListScreen (frame)", () => {
  it("draws filters, list, tabs and disabled actions without any request", () => {
    render(<SalesInvoiceListScreen />);
    expect(screen.getByRole("heading", { level: 1, name: "Hóa đơn bán" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Hình thức thanh toán" })).toBeTruthy();
    expect(screen.getAllByText("Chưa có dữ liệu để hiển thị.").length).toBeGreaterThan(1);
    expect(screen.getByRole("checkbox", { name: "Hoàn thành" })).toBeTruthy();
    for (const name of ["In danh sách", "Tạo phiếu trả hàng bán", "Gửi lại", "In"]) {
      expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    }
    fireEvent.click(screen.getByRole("tab", { name: "Gửi hóa đơn" }));
    expect(screen.getByRole("columnheader", { name: "Trạng thái gửi" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Gửi lại" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Chỉnh sửa" }));
    expect(screen.getByRole("columnheader", { name: "Loại sửa" })).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
