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
  const props = { action, baseline: employee, pending: false, busy: () => false, endDate: "2026-11-10", actionError: undefined, onEndDateChange: vi.fn(), onCancel: vi.fn(), onConfirm: vi.fn(), ...extra };
  render(<EmployeeStatusActionDialog {...props} />);
  return props;
}

it("ends employment with the kit's inline calendar and the Bỏ qua / Xác nhận actions", () => {
  const props = show("end-employment");
  expect(screen.getByRole("dialog", { name: "Nghỉ việc?" })).toBeTruthy();
  expect(screen.getByText(employee.fullName)).toBeTruthy();
  expect(screen.getByText("10/11/2026")).toBeTruthy();
  const day = document.querySelector<HTMLButtonElement>("button.rdp-day_button:not([disabled])");
  expect(day).toBeTruthy();
  fireEvent.click(day!);
  expect(props.onEndDateChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận nghỉ việc" }));
  expect(props.onConfirm).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
  expect(props.onCancel).toHaveBeenCalledTimes(1);
});

it("resumes employment without a date field", () => {
  show("resume");
  expect(screen.getByRole("dialog", { name: "Cho làm việc lại?" })).toBeTruthy();
  expect(document.querySelector("button.rdp-day_button")).toBeNull();
  expect(screen.getByRole("button", { name: "Xác nhận cho làm việc lại" })).toBeTruthy();
});

it("blocks both actions while the request is pending", () => {
  show("end-employment", { pending: true });
  expect((screen.getByRole("button", { name: "Bỏ qua" }) as HTMLButtonElement).disabled).toBe(true);
  expect((document.querySelector("button.rdp-day_button") as HTMLButtonElement).disabled).toBe(true);
});
