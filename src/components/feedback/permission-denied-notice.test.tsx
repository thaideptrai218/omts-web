// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { ErrorNotice } from "@/features/operations/ui";
import { PermissionDeniedNotice, isPermissionDenied } from "./permission-denied-notice";

afterEach(cleanup);

it("tells a refused permission apart from a transient error", () => {
  expect(isPermissionDenied("Bạn không có quyền thực hiện thao tác này.")).toBe(true);
  expect(isPermissionDenied("Chưa kết nối được dịch vụ. Hãy kiểm tra backend và thử tải lại.")).toBe(false);
  expect(isPermissionDenied(undefined)).toBe(false);
});

it("offers the overview instead of a retry when the list is refused", () => {
  render(<ListStateMessage error="Bạn không có quyền thực hiện thao tác này." onRetry={vi.fn()} retryLabel="Tải lại" />);
  expect(screen.queryByRole("button", { name: "Tải lại" })).toBeNull();
  expect(screen.getByRole("link", { name: "Về tổng quan" }).getAttribute("href")).toBe("/dashboard");
});

it("keeps the retry for a transient failure", () => {
  const retry = vi.fn();
  render(<ListStateMessage error="Chưa kết nối được dịch vụ. Hãy kiểm tra backend và thử tải lại." onRetry={retry} retryLabel="Tải lại" />);
  screen.getByRole("button", { name: "Tải lại" }).click();
  expect(retry).toHaveBeenCalledOnce();
  expect(screen.queryByRole("link", { name: "Về tổng quan" })).toBeNull();
});

it("links the overview from the shared error notice and the denied screen", () => {
  render(<><ErrorNotice error="Bạn không có quyền thực hiện thao tác này." /><PermissionDeniedNotice /></>);
  expect(screen.getAllByRole("link", { name: "Về tổng quan" })).toHaveLength(2);
});
