// @vitest-environment jsdom
import React from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmployeeManagementExperience } from "./employee-management-experience";
import type { UnlinkEmployeeAccountResult } from "@/features/employee-management/domain/employee-management";
import { mockEmployeeAccounts, mockEmployeeProfiles } from "@/features/employee-management/mocks/employee-management-fixtures";
import { createMockEmployeeManagementRepository } from "@/features/employee-management/repositories/mock-employee-management-repository";
import { employeeManagementService } from "@/features/employee-management/services/employee-management-service.instance";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("@/features/auth/state/auth-provider", () => ({
  useAuth: () => ({ state: { status: "authenticated", account: { access: {} } } }),
}));
vi.mock("@/features/access/lib/has-effective-permission", () => ({ hasEffectivePermission: () => true }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify }) }));
vi.mock("@/features/employee-management/services/employee-management-service.instance", () => ({
  employeeManagementService: { load: vi.fn(), save: vi.fn(), unlinkAccount: vi.fn() },
}));

const employee = mockEmployeeProfiles[0];
let repository: ReturnType<typeof createMockEmployeeManagementRepository>;
const service = vi.mocked(employeeManagementService);

// jsdom has no native modal stack; these shims test React state, not browser focus.
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); },
  });
});
afterAll(() => {
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  repository = createMockEmployeeManagementRepository({
    accounts: mockEmployeeAccounts, initialEmployees: mockEmployeeProfiles, latencyMs: 0,
  });
  service.load.mockImplementation(() => repository.load());
  service.save.mockImplementation((input) => repository.save(input));
  service.unlinkAccount.mockImplementation((input) => repository.unlinkAccount(input));
});

async function openEditor() {
  const user = userEvent.setup();
  const view = render(<EmployeeManagementExperience />);
  await user.click(await screen.findByRole("button", { name: new RegExp(employee.fullName) }));
  const editor = screen.getByRole("dialog", { name: employee.fullName });
  const notes = within(editor).getByRole<HTMLTextAreaElement>("textbox", { name: "Ghi chú" });
  await user.clear(notes);
  await user.type(notes, "Bản nháp chưa lưu");
  return { user, editor, notes, ...view };
}

async function openConfirmation(user: ReturnType<typeof userEvent.setup>, editor: HTMLElement) {
  await user.click(within(editor).getByRole("button", { name: "Bỏ liên kết tài khoản" }));
  return screen.getByRole("dialog", { name: "Bỏ liên kết tài khoản?" });
}

async function currentEmployee() {
  const result = await repository.load();
  if (result.status !== "loaded") throw new Error("Expected loaded workspace");
  return result.workspace.employees.find((item) => item.id === employee.id)!;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => { resolve = settle; });
  return { promise, resolve };
}

describe("employee unlink through list and editor", () => {
  it("keeps the actual editor mounted, retains notes, then saves with the returned version", async () => {
    const { user, editor, notes } = await openEditor();
    const confirmation = await openConfirmation(user, editor);
    await user.click(within(confirmation).getByRole("button", { name: /^Bỏ liên kết$/ }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: "Đã bỏ liên kết" })));
    expect(service.save).not.toHaveBeenCalled();
    expect(notes.isConnected).toBe(true);
    expect(notes.value).toBe("Bản nháp chưa lưu");
    const unlinked = await currentEmployee();
    expect(unlinked.account).toBeNull();
    expect(unlinked.recordVersion).not.toBe(employee.recordVersion);
    expect(within(editor).getByRole<HTMLSelectElement>("combobox", { name: /Tài khoản hệ thống/ }).value).toBe("");
    await user.click(within(editor).getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(service.save).toHaveBeenCalledWith(expect.objectContaining({
      id: employee.id, accountId: null, notes: "Bản nháp chưa lưu", recordVersion: unlinked.recordVersion,
    })));
    expect((await currentEmployee()).notes).toBe("Bản nháp chưa lưu");
    expect((await currentEmployee()).account).toBeNull();
  });

  it("canceling the confirmation retains the link, draft and original save version", async () => {
    const { user, editor, notes } = await openEditor();
    const confirmation = await openConfirmation(user, editor);
    await user.click(within(confirmation).getByRole("button", { name: "Hủy" }));
    expect(service.unlinkAccount).not.toHaveBeenCalled();
    expect(notes.value).toBe("Bản nháp chưa lưu");
    await user.click(within(editor).getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(service.save).toHaveBeenCalledWith(expect.objectContaining({
      accountId: employee.account.id, recordVersion: employee.recordVersion,
    })));
  });

  it("a native cancel event closes only the nested confirmation, preserving the editor draft", async () => {
    const { user, editor, notes } = await openEditor();
    const confirmation = await openConfirmation(user, editor);
    fireEvent(confirmation, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog", { name: "Bỏ liên kết tài khoản?" })).toBeNull();
    expect(screen.getByRole("dialog", { name: employee.fullName })).toBe(editor);
    expect(notes.isConnected).toBe(true);
    expect(notes.value).toBe("Bản nháp chưa lưu");
    expect(service.unlinkAccount).not.toHaveBeenCalled();
    await waitFor(() => expect(document.activeElement).toBe(
      within(editor).getByRole("combobox", { name: /Tài khoản hệ thống/ }),
    ));
  });

  it("keeps a newly selected account as an unsaved draft after unlinking the persisted account", async () => {
    const { user, editor, notes } = await openEditor();
    const workspace = await repository.load();
    if (workspace.status !== "loaded") throw new Error("Expected loaded workspace");
    const replacement = workspace.workspace.availableAccounts[0];
    const picker = within(editor).getByRole<HTMLSelectElement>("combobox", { name: /Tài khoản hệ thống/ });
    await user.selectOptions(picker, replacement.id);
    const confirmation = await openConfirmation(user, editor);
    expect(confirmation.textContent).toContain(`@${employee.account.username}`);
    await user.click(within(confirmation).getByRole("button", { name: /^Bỏ liên kết$/ }));
    await waitFor(() => expect(service.unlinkAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Bỏ liên kết tài khoản?" })).toBeNull());
    expect(picker.value).toBe(replacement.id);
    expect(notes.value).toBe("Bản nháp chưa lưu");
    expect((await currentEmployee()).account).toBeNull();
    const version = (await currentEmployee()).recordVersion;
    await user.click(within(editor).getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(service.save).toHaveBeenCalledWith(expect.objectContaining({
      accountId: replacement.id, recordVersion: version,
    })));
    expect((await currentEmployee()).account?.id).toBe(replacement.id);
  });

  it.each([
    { status: "forbidden", message: { code: "MSG02" } },
    { status: "invalid-version", message: { code: "MSG01" } },
    { status: "not-found" },
    { status: "conflict", message: { code: "MSG06", params: { user_name: "Người thử nghiệm", time: "10:30" } } },
  ] as const)("keeps the draft and saved link after $status", async (result) => {
    service.unlinkAccount.mockResolvedValueOnce(result);
    const { user, editor, notes } = await openEditor();
    const confirmation = await openConfirmation(user, editor);
    await user.click(within(confirmation).getByRole("button", { name: /^Bỏ liên kết$/ }));
    const alert = await within(editor).findByRole("alert");
    expect(alert.textContent).not.toMatch(/\{(?:time|user_name)\}/);
    expect(notes.value).toBe("Bản nháp chưa lưu");
    expect((await currentEmployee()).account).toEqual(employee.account);
    expect(service.save).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("does not claim an unchanged server state after an unknown write outcome", async () => {
    service.unlinkAccount.mockRejectedValueOnce(new TypeError("Network unavailable"));
    const { user, editor, notes } = await openEditor();
    const confirmation = await openConfirmation(user, editor);
    await user.click(within(confirmation).getByRole("button", { name: /^Bỏ liên kết$/ }));
    expect((await within(editor).findByRole("alert")).textContent).toContain("Chưa xác nhận được kết quả");
    expect(notes.value).toBe("Bản nháp chưa lưu");
    expect(service.unlinkAccount).toHaveBeenCalledTimes(1);
    expect(service.save).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("does not relink an account if unlink committed but its response was lost", async () => {
    service.unlinkAccount.mockImplementationOnce(async (input) => {
      await repository.unlinkAccount(input);
      throw new TypeError("Response lost after commit");
    });
    const { user, editor, notes } = await openEditor();
    const confirmation = await openConfirmation(user, editor);
    await user.click(within(confirmation).getByRole("button", { name: /^Bỏ liên kết$/ }));
    await within(editor).findByRole("alert");
    expect(service.unlinkAccount).toHaveBeenCalledTimes(1);
    expect((await currentEmployee()).account).toBeNull();
    await user.click(within(editor).getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(within(editor).getByRole("alert").textContent).toContain("Thay đổi của bạn chưa được lưu"));
    expect((await currentEmployee()).account).toBeNull();
    expect(notes.value).toBe("Bản nháp chưa lưu");
  });

  it("unlinks independently of an invalid draft without saving or clearing it", async () => {
    const { user, editor, notes } = await openEditor();
    const name = within(editor).getByRole<HTMLInputElement>("textbox", { name: /Họ và tên/ });
    await user.clear(name);
    const confirmation = await openConfirmation(user, editor);
    await user.click(within(confirmation).getByRole("button", { name: /^Bỏ liên kết$/ }));
    await waitFor(() => expect(notify).toHaveBeenCalled());
    expect(name.value).toBe("");
    expect(notes.value).toBe("Bản nháp chưa lưu");
    expect(service.save).not.toHaveBeenCalled();
    expect((await currentEmployee()).fullName).toBe(employee.fullName);
  });

  it("leaves an otherwise untouched form clean after unlinking", async () => {
    const user = userEvent.setup();
    render(<EmployeeManagementExperience />);
    await user.click(await screen.findByRole("button", { name: new RegExp(employee.fullName) }));
    const editor = screen.getByRole("dialog", { name: employee.fullName });
    const confirmation = await openConfirmation(user, editor);
    await user.click(within(confirmation).getByRole("button", { name: /^Bỏ liên kết$/ }));
    await waitFor(() => expect(notify).toHaveBeenCalled());
    expect(within(editor).getByRole<HTMLButtonElement>("button", { name: "Lưu thay đổi" }).disabled).toBe(true);
    expect(service.save).not.toHaveBeenCalled();
  });

  it("locks save, fields and dialog dismissal while unlink is pending, without a duplicate request", async () => {
    const response = deferred<UnlinkEmployeeAccountResult>();
    service.unlinkAccount.mockImplementationOnce(() => response.promise);
    const { user, editor, notes } = await openEditor();
    const confirmation = await openConfirmation(user, editor);
    const confirm = within(confirmation).getByRole<HTMLButtonElement>("button", { name: /^Bỏ liên kết$/ });
    await user.dblClick(confirm);
    expect(confirm.disabled).toBe(true);
    expect(notes.matches(":disabled")).toBe(true);
    expect(within(editor).queryByRole("button", { name: "Đóng hộp thoại" })).toBeNull();
    await act(async () => { fireEvent.submit(notes.closest("form")!); });
    expect(service.save).not.toHaveBeenCalled();
    expect(service.unlinkAccount).toHaveBeenCalledTimes(1);
    fireEvent(confirmation, new Event("cancel", { cancelable: true }));
    expect(confirmation.hasAttribute("open")).toBe(true);
    await act(async () => { response.resolve({ status: "unlinked", employee: { ...employee, account: null, recordVersion: "AAAAAAAA+/8=" } }); });
    expect(notes.value).toBe("Bản nháp chưa lưu");
    expect(notes.matches(":disabled")).toBe(false);
  });

  it("discards a late unlink response after the screen unmounts", async () => {
    const response = deferred<UnlinkEmployeeAccountResult>();
    service.unlinkAccount.mockImplementationOnce(() => response.promise);
    const { user, editor, unmount } = await openEditor();
    const confirmation = await openConfirmation(user, editor);
    await user.click(within(confirmation).getByRole("button", { name: /^Bỏ liên kết$/ }));
    unmount();
    await act(async () => { response.resolve({ status: "unlinked", employee: { ...employee, account: null, recordVersion: "AAAAAAAA+/8=" } }); });
    expect(notify).not.toHaveBeenCalled();
    expect(service.save).not.toHaveBeenCalled();
  });

  it("publishes MSG19 through the existing session-expiry channel", async () => {
    const expired = vi.fn();
    const unsubscribe = sessionExpiryChannel.subscribe(expired);
    try {
      service.unlinkAccount.mockResolvedValueOnce({ status: "session-expired", message: { code: "MSG19" } });
      const { user, editor, notes } = await openEditor();
      const confirmation = await openConfirmation(user, editor);
      await user.click(within(confirmation).getByRole("button", { name: /^Bỏ liên kết$/ }));
      await waitFor(() => expect(expired).toHaveBeenCalledWith({ code: "MSG19" }));
      expect(notes.value).toBe("Bản nháp chưa lưu");
      expect(notify).not.toHaveBeenCalled();
    } finally { unsubscribe(); }
  });
});
