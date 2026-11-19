// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { employeeDetailFixture } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";
import { EmployeeStatusActionDialog } from "./employee-status-action-dialog";

vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
// The ending dialog reads what ending would change; answer with an empty preview for the day asked.
vi.mock("@/features/operations/repository", () => ({
  createOperationsRepository: () => ({ read: async (_action: string, query: { lastWorkingDay?: string }) => ({ status: "success", data: { lastWorkingDay: query.lastWorkingDay, futureAssignments: [], checkedInNotOut: [], advanceBalance: 0, unpaidPayslips: 0, unpaidAmount: 0, account: null, accountCanBeLocked: false } }) }),
}));
afterEach(cleanup);

const employee = employeeViewSchema.parse(employeeDetailFixture());
function show(action: "end-employment" | "resume", extra: Partial<Parameters<typeof EmployeeStatusActionDialog>[0]> = {}) {
  const props = { action, baseline: employee, pending: false, busy: () => false, onCancel: vi.fn(), onConfirm: vi.fn(), ...extra };
  render(<EmployeeStatusActionDialog {...props} />);
  return props;
}

it("ends employment with the chosen last working day after its consequences are shown", async () => {
  const props = show("end-employment");
  expect(screen.getByRole("dialog", { name: "Nghỉ việc?" })).toBeTruthy();
  expect(screen.getByText(employee.fullName)).toBeTruthy();
  expect(screen.getAllByLabelText(/Ngày làm cuối/).length).toBeGreaterThan(0);
  expect(await screen.findByText(/Không có phân công, chấm công dở dang/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận nghỉ việc" }));
  expect(props.onConfirm).toHaveBeenCalledTimes(1);
  expect(vi.mocked(props.onConfirm).mock.calls[0][0]).toMatchObject({ lockAccount: false });
  fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
  expect(props.onCancel).toHaveBeenCalledTimes(1);
});

it("resumes employment in one step", () => {
  const props = show("resume");
  expect(screen.getByRole("dialog", { name: "Làm việc lại?" })).toBeTruthy();
  expect(document.querySelector(".rdp-root")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận làm việc lại" }));
  expect(props.onConfirm).toHaveBeenCalledTimes(1);
});

it("blocks both actions while the request is pending", async () => {
  show("end-employment", { pending: true });
  expect((screen.getByRole("button", { name: "Bỏ qua" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("button", { name: /Đang xử lý/ }).getAttribute("aria-busy")).toBe("true");
});
