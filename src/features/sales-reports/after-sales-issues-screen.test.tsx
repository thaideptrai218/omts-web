// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AfterSalesIssuesScreen } from "./after-sales-issues-screen";

const fetchSpy = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetchSpy); });
afterEach(() => { cleanup(); fetchSpy.mockClear(); vi.unstubAllGlobals(); });

it("renders the report frame: heading, columns, empty chart, disabled export, no request", () => {
  render(<AfterSalesIssuesScreen />);
  expect(screen.getByRole("heading", { level: 1, name: "Vấn đề sau bán" })).toBeTruthy();
  expect(screen.getAllByRole("columnheader", { name: "Hóa đơn đã hủy" }).length).toBeGreaterThan(0);
  expect(screen.getAllByText("Chưa có dữ liệu để hiển thị.").length).toBeGreaterThan(2);
  expect(screen.getByRole("group", { name: /Thời gian/ })).toBeTruthy();
  expect((screen.getByRole("button", { name: "Xuất file" }) as HTMLButtonElement).disabled).toBe(true);
  expect(fetchSpy).not.toHaveBeenCalled();
});
