// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { EmployeeApiEditor } from "./employee-editor";
import { employeeDetailFixture, workingZoneId } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";
const fixture = () => employeeViewSchema.parse(employeeDetailFixture());
const props = () => ({ record: fixture(), zones: [{ id: workingZoneId, code: "V01", name: "Vùng Đông", statusId: 101 }], jobTypes: [], lookupsReady: true, onClose: vi.fn(), onAdopt: vi.fn(), onSaved: vi.fn() });
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("employee editor tab groups", () => {
  it("preserves drafts across all four groups and saves once", async () => {
    repository.write.mockResolvedValue({ status: "success", data: fixture() });
    render(<EmployeeApiEditor {...props()} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Họ và tên *" }), { target: { value: "Tên đã sửa" } });
    fireEvent.click(screen.getByRole("tab", { name: "Ngân hàng" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Ngân hàng" }), { target: { value: "Ngân hàng mới" } });
    fireEvent.click(screen.getByRole("tab", { name: "Công việc" }));
    fireEvent.click(screen.getByRole("tab", { name: "Tài khoản đăng nhập" }));
    expect(screen.getByRole("tabpanel").textContent).toContain("@fixture.an");
    fireEvent.click(screen.getByRole("tab", { name: "Thông tin" }));
    expect((screen.getByRole("textbox", { name: "Họ và tên *" }) as HTMLInputElement).value).toBe("Tên đã sửa");
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1));
    expect(repository.write.mock.calls[0][1]).toMatchObject({ fullName: "Tên đã sửa", bankAccount: { bankName: "Ngân hàng mới", accountNumber: fixture().bankAccount!.accountNumber } });
  });
  it("marks a hidden invalid group and reveals and focuses its first invalid input", async () => {
    render(<EmployeeApiEditor {...props()} />);
    fireEvent.click(screen.getByRole("tab", { name: "Ngân hàng" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Số tài khoản" }), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("tab", { name: "Thông tin" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    const bankTab = screen.getByRole("tab", { name: /Ngân hàng.*Có lỗi/i });
    expect(bankTab.getAttribute("aria-selected")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Số tài khoản" })));
    expect(repository.write).not.toHaveBeenCalled();
  });
  it("maps server bank errors to the bank group, retaining values", async () => {
    repository.write.mockResolvedValue({ status: "error", code: "MSG01", httpStatus: 400, uncertain: false, employeeProblem: { kind: "invalid-fields", fields: ["Bank account"] } });
    render(<EmployeeApiEditor {...props()} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Họ và tên *" }), { target: { value: "Nháp của tôi" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await waitFor(() => expect(screen.getByRole("tab", { name: /Ngân hàng.*Có lỗi/i }).getAttribute("aria-selected")).toBe("true"));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Ngân hàng" })));
    fireEvent.click(screen.getByRole("tab", { name: "Thông tin" }));
    expect((screen.getByRole("textbox", { name: "Họ và tên *" }) as HTMLInputElement).value).toBe("Nháp của tôi");
  });
  it("supports arrow, Home and End keys and never submits on tab changes", () => {
    render(<EmployeeApiEditor {...props()} />);
    const first = screen.getByRole("tab", { name: "Thông tin" });
    first.focus(); fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Công việc" }));
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Tài khoản đăng nhập" }));
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(document.activeElement).toBe(first);
    expect(repository.write).not.toHaveBeenCalled();
  });
});
