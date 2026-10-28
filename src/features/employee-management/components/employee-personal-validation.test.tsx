// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmployeeEditor } from "./employee-editor";
import { EmployeeManagementService } from "../services/employee-management-service";
import { createMockEmployeeManagementRepository } from "../repositories/mock-employee-management-repository";
import { mockEmployeeAccounts, mockEmployeeProfiles, mockEmployeeZones } from "../mocks/employee-management-fixtures";

const employee = mockEmployeeProfiles[0];
function personalControl(label: string) {
  return label === "Ngày sinh (không bắt buộc)" ? screen.getByLabelText<HTMLInputElement>(label)
    : screen.getByRole<HTMLInputElement | HTMLTextAreaElement>("textbox", { name: label });
}
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-28T10:00:00Z")); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
function setup() {
  const repository = createMockEmployeeManagementRepository({ accounts: mockEmployeeAccounts, initialEmployees: mockEmployeeProfiles,
    zones: mockEmployeeZones, latencyMs: 0 });
  const service = new EmployeeManagementService(repository);
  const save = vi.spyOn(service, "save");
  const onSaved = vi.fn();
  const view = render(<EmployeeEditor employee={employee} service={service} availableAccounts={mockEmployeeAccounts} zones={mockEmployeeZones}
    onSaved={onSaved} onUnlinked={vi.fn()} onOpenExisting={vi.fn()} onPendingChange={vi.fn()} />);
  return { ...view, repository, save, onSaved, user: userEvent.setup() };
}

describe("personal field validation in the employee editor", () => {
  it("does not save after unmount while form validation is still pending", async () => {
    const { unmount, save, repository, onSaved } = setup();
    const notes = screen.getByLabelText("Ghi chú");
    fireEvent.change(notes, { target: { value: "Bản nháp trước khi đóng" } });
    await act(async () => { fireEvent.submit(notes.closest("form")!); unmount(); });
    expect(save).not.toHaveBeenCalled(); expect(repository.snapshotEmployees()[0]).toEqual(employee);
    expect(onSaved).not.toHaveBeenCalled();
  });
  it("does not save the discarded draft when validation finishes after Hủy thay đổi", async () => {
    const { save, repository, onSaved } = setup();
    const notes = screen.getByLabelText<HTMLTextAreaElement>("Ghi chú");
    fireEvent.change(notes, { target: { value: "Bản nháp cần hủy" } });
    await act(async () => {
      fireEvent.submit(notes.closest("form")!);
      fireEvent.click(screen.getByRole("button", { name: "Hủy thay đổi" }));
    });
    expect(save).not.toHaveBeenCalled(); expect(repository.snapshotEmployees()[0]).toEqual(employee);
    expect(notes.value).toBe(employee.notes); expect(onSaved).not.toHaveBeenCalled();
  });
  it("connects each visible hint to its control and exposes today's date without clipping text", () => {
    setup();
    for (const label of ["Họ và tên", "Số điện thoại", "Ngày sinh (không bắt buộc)", "Địa chỉ", "Khu vực", "Phường/Xã", "Thông tin khác", "Ghi chú"]) {
      const control = personalControl(label);
      const hint = document.getElementById(control.getAttribute("aria-describedby")!);
      expect(hint?.textContent).toBeTruthy();
    }
    expect(screen.getByLabelText("Ngày sinh (không bắt buộc)").getAttribute("max")).toBe("2026-10-28");
    expect(screen.getByLabelText("Ghi chú").hasAttribute("maxlength")).toBe(false);
  });
  it("rejects invalid phone before calling the service, focuses it and keeps the other draft", async () => {
    const { user, save, repository } = setup();
    fireEvent.change(personalControl("Số điện thoại"), { target: { value: "090abc" } });
    fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Bản nháp cần giữ" } });
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    const phone = personalControl("Số điện thoại");
    await waitFor(() => expect(phone.getAttribute("aria-invalid")).toBe("true"));
    expect(document.activeElement).toBe(phone);
    expect(screen.getByLabelText<HTMLTextAreaElement>("Ghi chú").value).toBe("Bản nháp cần giữ");
    expect(save).not.toHaveBeenCalled(); expect(repository.snapshotEmployees()[0]).toEqual(employee);
  });
  it("rejects a future birthday, then permits clearing the optional date and saving the draft", async () => {
    const { user, save, onSaved, repository } = setup();
    const birthday = screen.getByLabelText<HTMLInputElement>("Ngày sinh (không bắt buộc)");
    fireEvent.change(birthday, { target: { value: "2026-10-29" } });
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(birthday.getAttribute("aria-invalid")).toBe("true"));
    expect(document.activeElement).toBe(birthday); expect(save).not.toHaveBeenCalled();
    fireEvent.change(birthday, { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(repository.snapshotEmployees()[0]).toMatchObject({ birthday: "", account: employee.account });
  });
  it.each([
    ["Họ và tên", 100], ["Địa chỉ", 500], ["Khu vực", 100],
    ["Phường/Xã", 100], ["Thông tin khác", 1000], ["Ghi chú", 1000],
  ] as const)("keeps overlong %s intact and shows its validation message", async (label, limit) => {
    const { user, save } = setup();
    const field = personalControl(label);
    fireEvent.change(field, { target: { value: "á".repeat(limit + 1) } });
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(field.getAttribute("aria-invalid")).toBe("true"));
    expect(document.activeElement).toBe(field); expect(field.value).toHaveLength(limit + 1);
    const descriptions = field.getAttribute("aria-describedby")!.split(/\s+/).map((id) => document.getElementById(id)?.textContent);
    expect(descriptions.join(" ")).toContain(`tối đa ${limit} ký tự`);
    expect(save).not.toHaveBeenCalled();
  });
  it("saves supported phone input normalized by the mock and preserves account and other fields", async () => {
    const { user, repository, save, onSaved } = setup();
    fireEvent.change(personalControl("Số điện thoại"), { target: { value: "+84 901 234 567" } });
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(save).toHaveBeenCalledOnce();
    expect(repository.snapshotEmployees()[0]).toMatchObject({ phone: employee.phone, account: employee.account, birthday: employee.birthday });
  });
});
