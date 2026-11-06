// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { EmployeeEditor } from "./employee-editor";
import { mockEmployeeProfiles, mockEmployeeAccounts, mockEmployeeZones } from "../mocks/employee-management-fixtures";
import type { SaveEmployeeInput, SaveEmployeeResult, UnlinkEmployeeAccountInput, UnlinkEmployeeAccountResult } from "../domain/employee-management";

vi.mock("../services/employee-management-service.instance", () => ({ employeeManagementService: { save: vi.fn(), unlinkAccount: vi.fn() } }));

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const employee = mockEmployeeProfiles[0];
const duplicateId = "b669dc43-c9dc-4df8-930b-ab9de6d978e3";

function setup(result: SaveEmployeeResult) {
  const service = {
    endEmployment: vi.fn(async () => ({ status: "not-found" as const })),
    reinstate: vi.fn(async () => ({ status: "not-found" as const })),
    save: vi.fn<(input: SaveEmployeeInput) => Promise<SaveEmployeeResult>>().mockResolvedValue(result),
    unlinkAccount: vi.fn<(input: UnlinkEmployeeAccountInput) => Promise<UnlinkEmployeeAccountResult>>().mockResolvedValue({ status: "not-found" }),
  };
  const callbacks = { onOpenExisting: vi.fn<(id: string) => boolean | void>(), onPendingChange: vi.fn(), onSaved: vi.fn(), onUnlinked: vi.fn() };
  const view = render(<EmployeeEditor employee={employee} availableAccounts={mockEmployeeAccounts} zones={mockEmployeeZones} service={service} {...callbacks} />);
  const notes = screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Ghi chú" });
  fireEvent.change(notes, { target: { value: "Bản nháp đang nhập" } });
  return { ...view, service, callbacks, notes, user: userEvent.setup() };
}

describe("structured employee errors in the actual editor", () => {
  it("marks multiple fields with descriptions and focuses the first control in visual order", async () => {
    const { user, notes, callbacks } = setup({ status: "invalid-fields", code: "MSG01", fields: ["notes", "birthday", "phone", "wardCommune"] });
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    for (const name of ["Số điện thoại", "Ngày sinh (không bắt buộc)", "Phường/Xã", "Ghi chú"]) {
      const field = name === "Số điện thoại" ? screen.getByRole("textbox", { name }) : screen.getByLabelText(name);
      await waitFor(() => expect(field.getAttribute("aria-invalid")).toBe("true"));
      const descriptions = field.getAttribute("aria-describedby")!.split(/\s+/).map((id) => document.getElementById(id));
      expect(descriptions.every(Boolean)).toBe(true);
      expect(descriptions.map((element) => element?.textContent).join(" ")).toContain("Vui lòng kiểm tra lại");
    }
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Số điện thoại" })));
    expect(notes.value).toBe("Bản nháp đang nhập"); expect(callbacks.onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Lưu thay đổi" }).hasAttribute("disabled")).toBe(false);
  });

  it.each(["Địa chỉ", "Khu vực", "Thông tin khác"])("shows a server error beside optional field %s", async (name) => {
    const field = name === "Địa chỉ" ? "address" : name === "Khu vực" ? "area" : "otherInformation";
    const { user } = setup({ status: "invalid-fields", code: "MSG01", fields: [field] });
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(screen.getByLabelText(name).getAttribute("aria-invalid")).toBe("true"));
  });

  it("retains version issues in a focusable summary and does not advance the stored version", async () => {
    const { user, notes, service } = setup({ status: "invalid-fields", code: "MSG01", fields: ["recordVersion"] });
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    const summary = await screen.findByRole("alert");
    expect(summary.textContent).toContain("Phiên bản hồ sơ");
    await waitFor(() => expect(document.activeElement).toBe(summary));
    expect(screen.getByRole("textbox", { name: "Họ và tên" }).getAttribute("aria-invalid")).toBe("false");
    expect(notes.value).toBe("Bản nháp đang nhập");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(service.save.mock.calls.map(([input]) => input.recordVersion)).toEqual([employee.recordVersion, employee.recordVersion]);
  });

  it("keeps mixed group and input errors visible while focusing a real input only", async () => {
    const { user } = setup({ status: "invalid-fields", code: "MSG01", fields: ["bankAccount", "phone", "recordVersion"] });
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Thông tin ngân hàng");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Số điện thoại" })));
  });

  it.each(["workingZoneIds", "bankAccount"] as const)("binds %s to its real group and focuses the group without guessing a child error", async (field) => {
    const { user, notes } = setup({ status: "invalid-fields", code: "MSG01", fields: [field] });
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    const group = screen.getByRole("group", { name: field === "bankAccount" ? "Thông tin ngân hàng" : "Vùng làm việc" });
    await waitFor(() => expect(group.getAttribute("aria-invalid")).toBe("true"));
    await waitFor(() => expect(document.activeElement).toBe(group));
    expect(group.getAttribute("aria-describedby")).toContain("error");
    expect(screen.getByRole("textbox", { name: "Tên ngân hàng" }).getAttribute("aria-invalid")).toBe("false");
    expect(notes.value).toBe("Bản nháp đang nhập");
  });

  it("keeps a duplicate ID until an explicit click and never resets the draft on failure", async () => {
    const { user, callbacks, notes } = setup({ status: "duplicate", code: "MSG03", existingEmployeeId: duplicateId });
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    const open = await screen.findByRole("button", { name: "Mở hồ sơ hiện có" });
    expect(callbacks.onOpenExisting).not.toHaveBeenCalled(); expect(callbacks.onSaved).not.toHaveBeenCalled();
    expect(notes.value).toBe("Bản nháp đang nhập");
    await user.click(open); expect(callbacks.onOpenExisting).toHaveBeenCalledExactlyOnceWith(duplicateId);
  });

  it("keeps the draft and reports an unavailable existing profile instead of dropping the editor", async () => {
    const { user, callbacks, notes } = setup({ status: "duplicate", code: "MSG03", existingEmployeeId: duplicateId });
    callbacks.onOpenExisting.mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await user.click(await screen.findByRole("button", { name: "Mở hồ sơ hiện có" }));
    expect(screen.getByText(/Chưa mở được hồ sơ này/)).toBeTruthy(); expect(notes.value).toBe("Bản nháp đang nhập");
  });

  it("removes old duplicate feedback when a later save returns a different field error", async () => {
    const { user, service } = setup({ status: "duplicate", code: "MSG03", existingEmployeeId: duplicateId });
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await screen.findByRole("button", { name: "Mở hồ sơ hiện có" });
    service.save.mockResolvedValueOnce({ status: "invalid-fields", code: "MSG01", fields: ["phone"] });
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Mở hồ sơ hiện có" })).toBeNull());
    expect(screen.getByRole("textbox", { name: "Họ và tên" }).getAttribute("aria-invalid")).toBe("false");
  });

  it("does not reuse an earlier open failure for a new duplicate result with the same ID", async () => {
    const { user, callbacks } = setup({ status: "duplicate", code: "MSG03", existingEmployeeId: duplicateId });
    callbacks.onOpenExisting.mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await user.click(await screen.findByRole("button", { name: "Mở hồ sơ hiện có" }));
    expect(screen.getByText(/Chưa mở được hồ sơ này/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await screen.findByRole("button", { name: "Mở hồ sơ hiện có" });
    expect(screen.queryByText(/Chưa mở được hồ sơ này/)).toBeNull();
    expect(callbacks.onOpenExisting).toHaveBeenCalledTimes(1);
  });

  it("ignores a structured error received after the editor unmounts", async () => {
    const { user, service, unmount, callbacks } = setup({ status: "invalid-fields", code: "MSG01", fields: ["phone"] });
    let resolve!: (result: SaveEmployeeResult) => void;
    service.save.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(service.save).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => resolve({ status: "duplicate", code: "MSG03", existingEmployeeId: duplicateId }));
    expect(callbacks.onSaved).not.toHaveBeenCalled(); expect(callbacks.onOpenExisting).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("cancels a queued error-focus frame when the editor closes", async () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const { user, unmount } = setup({ status: "invalid-fields", code: "MSG01", fields: ["phone"] });
    const phone = screen.getByRole("textbox", { name: "Số điện thoại" });
    const focus = vi.spyOn(phone, "focus");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await screen.findByRole("alert");
    await waitFor(() => expect(frames.length).toBeGreaterThan(0));
    unmount();
    expect(cancel).toHaveBeenCalled();
    // A callback already dispatched by the browser still checks its operation.
    frames.forEach((callback) => callback(0));
    expect(focus).not.toHaveBeenCalled();
  });

  it("keeps account/draft/version intact for a structured unlink-version error", async () => {
    const { user, service, callbacks, notes } = setup({ status: "invalid-fields", code: "MSG01", fields: ["phone"] });
    service.unlinkAccount.mockResolvedValueOnce({ status: "invalid-fields", code: "MSG01", fields: ["recordVersion"] });
    await user.click(screen.getByRole("button", { name: "Bỏ liên kết tài khoản" }));
    await user.click(await screen.findByRole("button", { name: /^Bỏ liên kết$/ }));
    const summary = await screen.findByRole("alert"); expect(summary.textContent).toContain("Phiên bản hồ sơ");
    await waitFor(() => expect(document.activeElement).toBe(summary));
    expect(notes.value).toBe("Bản nháp đang nhập"); expect(callbacks.onUnlinked).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Tài khoản hệ thống (không bắt buộc)")).toHaveProperty("value", employee.account?.id);
  });

  it("restores account focus after a successful unlink commits the enabled form", async () => {
    // Model a frame that becomes available before React commits the handler's
    // state updates. Focus requested in the response handler is too early.
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { callback(0); return 1; });
    const { user, service, callbacks, notes } = setup({ status: "invalid-fields", code: "MSG01", fields: ["phone"] });
    const account = screen.getByRole("combobox", { name: /Tài khoản hệ thống/ });
    const nativeFocus = account.focus.bind(account);
    // jsdom does not enforce the browser's disabled-fieldset focus restriction.
    vi.spyOn(account, "focus").mockImplementation(() => {
      if (!account.closest("fieldset[disabled]")) nativeFocus();
    });
    const unlinked = { ...employee, account: null, recordVersion: "AAAAAAAB+/8=" };
    let completeUnlink!: (result: UnlinkEmployeeAccountResult) => void;
    service.unlinkAccount.mockImplementationOnce(() => new Promise((resolve) => { completeUnlink = resolve; }));
    await user.click(screen.getByRole("button", { name: "Bỏ liên kết tài khoản" }));
    await user.click(await screen.findByRole("button", { name: /^Bỏ liên kết$/ }));
    expect(account.closest("fieldset[disabled]")).not.toBeNull();
    await act(async () => completeUnlink({ status: "unlinked", employee: unlinked }));
    await waitFor(() => expect(callbacks.onUnlinked).toHaveBeenCalledExactlyOnceWith(unlinked));
    await waitFor(() => expect(document.activeElement).toBe(account));
    expect(notes.value).toBe("Bản nháp đang nhập");
  });
});
