// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BootScreen } from "./boot-screen";

afterEach(cleanup);

it("màn tải toàn trang là vùng trạng thái có chữ tiếng Việt, đang bận, căn giữa", () => {
  render(<BootScreen message="Đang kiểm tra phiên đăng nhập..." />);
  const status = screen.getByRole("status");
  expect(status.getAttribute("aria-busy")).toBe("true");
  expect(status.getAttribute("aria-live")).toBe("polite");
  expect(status.className).toContain("place-items-center");
  expect(screen.getByText("Đang kiểm tra phiên đăng nhập...")).toBeTruthy();
});

it("có chữ mặc định khi không truyền nội dung", () => {
  render(<BootScreen />);
  expect(screen.getByText("Đang tải hệ thống...")).toBeTruthy();
});
