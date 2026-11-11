// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { employeeDetailFixture } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";
import { EmployeeStatusActionDialog } from "./employee-status-action-dialog";

vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
afterEach(cleanup);

const employee = employeeViewSchema.parse(employeeDetailFixture());
function show(action: "end-employment" | "resume", extra: Partial<Parameters<typeof EmployeeStatusActionDialog>[0]> = {}) {
  const props = { action, baseline: employee, pending: false, busy: () => false, onCancel: vi.fn(), onConfirm: vi.fn(), ...extra };
  render(<EmployeeStatusActionDialog {...props} />);
  return props;
}

it("ends employment in one step with no date to pick", () => {
  const props = show("end-employment");
  expect(screen.getByRole("dialog", { name: "Nghỉ việc?" })).toBeTruthy();
  expect(screen.getByText(employee.fullName)).toBeTruthy();
  expect(screen.getByText(/Ngày làm cuối là hôm nay/)).toBeTruthy();
  // no calendar, no date field
  expect(document.querySelector(".rdp-root")).toBeNull();
  expect(screen.queryByRole("button", { name: /Ngày nghỉ việc/ })).toBeNull();
  expect(screen.queryByLabelText(/Ngày nghỉ việc/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận nghỉ việc" }));
  expect(props.onConfirm).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
  expect(props.onCancel).toHaveBeenCalledTimes(1);
});

it("resumes employment in one step", () => {
  const props = show("resume");
  expect(screen.getByRole("dialog", { name: "Cho làm việc lại?" })).toBeTruthy();
  expect(document.querySelector(".rdp-root")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận cho làm việc lại" }));
  expect(props.onConfirm).toHaveBeenCalledTimes(1);
});

it("blocks both actions while the request is pending", () => {
  show("end-employment", { pending: true });
  expect((screen.getByRole("button", { name: "Bỏ qua" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("button", { name: /Đang xử lý/ }).getAttribute("aria-busy")).toBe("true");
});
