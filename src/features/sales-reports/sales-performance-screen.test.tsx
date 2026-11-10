// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SalesPerformanceScreen } from "./sales-performance-screen";

const fetchSpy = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetchSpy); });
afterEach(() => { cleanup(); fetchSpy.mockClear(); vi.unstubAllGlobals(); });

it("renders the report frame: heading, columns, empty chart, disabled export, no request", () => {
  render(<SalesPerformanceScreen />);
  expect(screen.getByRole("heading", { level: 1, name: "Hiệu quả bán hàng" })).toBeTruthy();
  expect(screen.getAllByRole("columnheader", { name: "Doanh thu thuần (₫)" }).length).toBeGreaterThan(0);
  expect(screen.getAllByText("Chưa có dữ liệu để hiển thị.").length).toBeGreaterThan(2);
  expect(screen.getByRole("group", { name: /Thời gian/ })).toBeTruthy();
  expect((screen.getByRole("button", { name: "Xuất file" }) as HTMLButtonElement).disabled).toBe(true);
  expect(fetchSpy).not.toHaveBeenCalled();
});
