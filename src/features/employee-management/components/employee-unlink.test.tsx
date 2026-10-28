// @vitest-environment jsdom
import React from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmployeeManagementExperience } from "./employee-management-experience";
import type { UnlinkEmployeeAccountResult } from "@/features/employee-management/domain/employee-management";
import type { ChangeEmployeeEmploymentResult } from "../domain/employee-employment";
import { mockEmployeeAccounts, mockEmployeeProfiles, mockEmployeeZones } from "@/features/employee-management/mocks/employee-management-fixtures";
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
  employeeManagementService: { load: vi.fn(), save: vi.fn(), unlinkAccount: vi.fn(), endEmployment: vi.fn(), reinstate: vi.fn() },
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
    accounts: mockEmployeeAccounts, initialEmployees: mockEmployeeProfiles, zones: mockEmployeeZones, latencyMs: 0,
  });
  service.load.mockImplementation(() => repository.load());
  service.save.mockImplementation((input) => repository.save(input));
  service.unlinkAccount.mockImplementation((input) => repository.unlinkAccount(input));
  service.endEmployment.mockImplementation((input) => repository.endEmployment(input));
  service.reinstate.mockImplementation((input) => repository.reinstate(input));
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

function fillBank(editor: HTMLElement) {
  const values = { "Tên ngân hàng": "Ngân hàng kiểm thử", "Số tài khoản": "00123456", "Tên chủ tài khoản": "nguyễn văn an" };
  for (const [name, value] of Object.entries(values)) {
    const field = within(editor).getByRole("textbox", { name });
    fireEvent.change(field, { target: { value } });
    fireEvent.blur(field);
  }
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
  it("does not start an old profile save after opening the unlink confirmation", async () => {
    const { editor, notes } = await openEditor();
    await act(async () => {
      fireEvent.submit(notes.closest("form")!);
      fireEvent.click(within(editor).getByRole("button", { name: "Bỏ liên kết tài khoản" }));
    });
    expect(service.save).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Bỏ liên kết tài khoản?" })).toBeTruthy();
    expect(repository.snapshotEmployees()[0]).toEqual(employee);
  });
  it("updates working-zone rows and an active zone filter after saving the actual editor", async () => {
    const { user, editor } = await openEditor();
    fireEvent.change(screen.getByLabelText("Vùng làm việc"), { target: { value: "zone-east" } });
    await user.click(within(editor).getByRole("checkbox", { name: "Khu Đông" }));
    await user.click(within(editor).getByRole("checkbox", { name: "Khu Nam" }));
    await user.click(within(editor).getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: employee.fullName })).toBeNull());
    expect(screen.queryByRole("button", { name: /Nguyễn Văn An/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Vùng làm việc"), { target: { value: "zone-south" } });
    const row = screen.getByRole("button", { name: /Nguyễn Văn An/ });
    expect(within(row).getByText("Khu Nam")).toBeTruthy();
    await user.click(row);
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Khu Nam" }).checked).toBe(true);
    expect(repository.snapshotEmployees()[0].account?.id).toBe(employee.account.id);
  });
  it("keeps keyboard focus in the working-zone group after removing a discontinued checkbox", async () => {
    repository = createMockEmployeeManagementRepository({
      accounts: mockEmployeeAccounts, zones: mockEmployeeZones, latencyMs: 0,
      initialEmployees: [{ ...employee, workingZoneIds: ["zone-west"] }],
    });
    const { user, editor, notes } = await openEditor();
    const stopped = within(editor).getByRole<HTMLInputElement>("checkbox", { name: /Khu Tây/ });
    stopped.focus();
    await user.keyboard(" ");
    expect(within(editor).queryByRole("checkbox", { name: /Khu Tây/ })).toBeNull();
    const group = within(editor).getByRole("group", { name: "Vùng làm việc" });
    await waitFor(() => expect(document.activeElement).toBe(group));
    expect(notes.value).toBe("Bản nháp chưa lưu");
    expect(service.save).not.toHaveBeenCalled();
  });
  it("preserves a discontinued assignment until the Owner removes it, then saves without offering it again", async () => {
    repository = createMockEmployeeManagementRepository({
      accounts: mockEmployeeAccounts, zones: mockEmployeeZones, latencyMs: 0,
      initialEmployees: [{ ...employee, workingZoneIds: ["zone-west"] }],
    });
    const { user, editor, notes } = await openEditor();
    const stopped = within(editor).getByRole<HTMLInputElement>("checkbox", { name: /Khu Tây/ });
    expect(stopped.checked).toBe(true);
    expect(stopped.disabled).toBe(false);
    await user.click(within(editor).getByRole("button", { name: "Lưu thay đổi" }));
    const group = within(editor).getByRole("group", { name: "Vùng làm việc" });
    await waitFor(() => expect(group.getAttribute("aria-invalid")).toBe("true"));
    expect((await currentEmployee()).recordVersion).toBe(employee.recordVersion);
    expect(notes.value).toBe("Bản nháp chưa lưu");
    await user.click(stopped);
    expect(within(editor).queryByRole("checkbox", { name: /Khu Tây/ })).toBeNull();
    await user.click(within(editor).getByRole("checkbox", { name: "Khu Nam" }));
    await user.click(within(editor).getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: "Đã lưu hồ sơ" })));
    const saved = await currentEmployee();
    expect(saved.workingZoneIds).toEqual(["zone-south"]);
    expect(saved.recordVersion).not.toBe(employee.recordVersion);
    expect(saved.account).toEqual(employee.account);
  });
  it("creates a profile with bank and working zones without creating an account", async () => {
    const user = userEvent.setup();
    render(<EmployeeManagementExperience />);
    await user.click(await screen.findByRole("button", { name: "Thêm nhân viên" }));
    const editor = screen.getByRole("dialog", { name: "Thêm nhân viên" });
    fireEvent.change(within(editor).getByRole("textbox", { name: "Họ và tên" }), { target: { value: "Nhân viên kiểm thử ngân hàng" } });
    fireEvent.change(within(editor).getByRole("textbox", { name: "Số điện thoại" }), { target: { value: "0900000088" } });
    fillBank(editor);
    await user.click(within(editor).getByRole("checkbox", { name: "Khu Nam" }));
    await user.click(within(editor).getByRole("button", { name: "Thêm nhân viên" }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: "Đã lưu hồ sơ" })));
    const created = repository.snapshotEmployees().find((item) => item.fullName === "Nhân viên kiểm thử ngân hàng");
    expect(created).toMatchObject({ account: null, workingZoneIds: ["zone-south"], bankAccount: {
      bankName: "Ngân hàng kiểm thử", accountNumber: "00123456", accountHolderName: "NGUYỄN VĂN AN",
    } });
  });
  it("saves bank and multiple working zones, then reopens the persisted values", async () => {
    const { user, editor } = await openEditor();
    await user.click(within(editor).getByRole("checkbox", { name: "Khu Nam" }));
    fillBank(editor);
    await user.click(within(editor).getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: "Đã lưu hồ sơ" })));
    const saved = await currentEmployee();
    expect(saved.workingZoneIds).toEqual(["zone-east", "zone-south"]);
    expect(saved.bankAccount).toEqual({ bankName: "Ngân hàng kiểm thử", accountNumber: "00123456", accountHolderName: "NGUYỄN VĂN AN" });
    expect(saved.account).toEqual(employee.account);
    await user.click(screen.getByRole("button", { name: new RegExp(employee.fullName) }));
    const reopened = screen.getByRole("dialog", { name: employee.fullName });
    expect(within(reopened).getByRole<HTMLInputElement>("checkbox", { name: "Khu Nam" }).checked).toBe(true);
    expect(within(reopened).getByRole<HTMLInputElement>("textbox", { name: "Số tài khoản" }).value).toBe("00123456");
    expect(within(reopened).getByRole<HTMLInputElement>("textbox", { name: "Tên chủ tài khoản" }).value).toBe("NGUYỄN VĂN AN");
  });

  it("marks every missing bank field and focuses the first without calling save", async () => {
    const { user, editor, notes } = await openEditor();
    fireEvent.change(within(editor).getByRole("textbox", { name: "Tên ngân hàng" }), { target: { value: "Ngân hàng kiểm thử" } });
    await user.click(within(editor).getByRole("button", { name: "Lưu thay đổi" }));
    const number = within(editor).getByRole("textbox", { name: "Số tài khoản" });
    await waitFor(() => expect(number.getAttribute("aria-invalid")).toBe("true"));
    expect(within(editor).getByRole("textbox", { name: "Tên chủ tài khoản" }).getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(number.getAttribute("aria-describedby")!)?.textContent).toContain("Vui lòng kiểm tra lại");
    await waitFor(() => expect(document.activeElement).toBe(number));
    expect(notes.value).toBe("Bản nháp chưa lưu");
    expect(service.save).not.toHaveBeenCalled();
  });

  it("clears the optional bank and zones explicitly without changing the account link", async () => {
    repository = createMockEmployeeManagementRepository({
      accounts: mockEmployeeAccounts, zones: mockEmployeeZones, latencyMs: 0,
      initialEmployees: [{ ...employee, bankAccount: { bankName: "Ngân hàng kiểm thử", accountNumber: "00123456", accountHolderName: "NGUYỄN VĂN AN" } }],
    });
    const { user, editor } = await openEditor();
    for (const name of ["Tên ngân hàng", "Số tài khoản", "Tên chủ tài khoản"]) {
      fireEvent.change(within(editor).getByRole("textbox", { name }), { target: { value: "" } });
    }
    await user.click(within(editor).getByRole("checkbox", { name: "Khu Đông" }));
    await user.click(within(editor).getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: "Đã lưu hồ sơ" })));
    expect(await currentEmployee()).toMatchObject({ bankAccount: null, workingZoneIds: [], account: employee.account });
  });

  it("handles an empty zone catalog while saving an employee without bank or zones", async () => {
    repository = createMockEmployeeManagementRepository({
      accounts: mockEmployeeAccounts, zones: [], latencyMs: 0,
      initialEmployees: [{ ...employee, workingZoneIds: [] }],
    });
    const { user, editor } = await openEditor();
    expect(within(editor).getByText("Chưa có vùng đang sử dụng để chọn.")).toBeTruthy();
    await user.click(within(editor).getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: "Đã lưu hồ sơ" })));
    expect(await currentEmployee()).toMatchObject({ bankAccount: null, workingZoneIds: [] });
  });

  it("keeps a zone missing from the catalog in the draft when an active zone is added", async () => {
    repository = createMockEmployeeManagementRepository({
      accounts: mockEmployeeAccounts, zones: mockEmployeeZones, latencyMs: 0,
      initialEmployees: [{ ...employee, workingZoneIds: ["old-unlisted-zone"] }],
    });
    const { user, editor, notes } = await openEditor();
    expect(within(editor).getByText(/Hồ sơ đang gắn 1 vùng chưa có/)).toBeTruthy();
    expect(within(editor).queryByRole("checkbox", { name: /Khu Tây/ })).toBeNull();
    await user.click(within(editor).getByRole("checkbox", { name: "Khu Nam" }));
    await user.click(within(editor).getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(service.save).toHaveBeenCalledWith(expect.objectContaining({ workingZoneIds: ["old-unlisted-zone", "zone-south"] })));
    const group = within(editor).getByRole("group", { name: "Vùng làm việc" });
    await waitFor(() => expect(group.getAttribute("aria-invalid")).toBe("true"));
    expect(notes.value).toBe("Bản nháp chưa lưu");
    expect(notify).not.toHaveBeenCalled();
  });
  it("opens the duplicate profile from the workspace only after an explicit click", async () => {
    const existingEmployeeId = "b669dc43-c9dc-4df8-930b-ab9de6d978e3";
    const target = { ...mockEmployeeProfiles[1], id: existingEmployeeId };
    const loaded = await repository.load();
    if (loaded.status !== "loaded") throw new Error("Expected loaded workspace");
    service.load.mockResolvedValueOnce({
      ...loaded,
      workspace: { ...loaded.workspace, employees: [employee, target] },
    });
    service.save.mockResolvedValueOnce({ status: "duplicate", code: "MSG03", existingEmployeeId });
    const { user, editor, notes } = await openEditor();
    await user.click(within(editor).getByRole("button", { name: "Lưu thay đổi" }));
    const open = await within(editor).findByRole("button", { name: "Mở hồ sơ hiện có" });
    expect(screen.getByRole("dialog", { name: employee.fullName })).toBe(editor);
    expect(notes.value).toBe("Bản nháp chưa lưu");
    await user.click(open);
    const targetEditor = screen.getByRole("dialog", { name: target.fullName });
    expect(within(targetEditor).getByRole<HTMLInputElement>("textbox", { name: "Họ và tên" }).value).toBe(target.fullName);
    expect(service.load).toHaveBeenCalledTimes(1);
    expect(service.save).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
  });

  it("retains the editor and draft when the duplicate ID is absent from the workspace", async () => {
    service.save.mockResolvedValueOnce({
      status: "duplicate", code: "MSG03", existingEmployeeId: "b669dc43-c9dc-4df8-930b-ab9de6d978e3",
    });
    const { user, editor, notes } = await openEditor();
    await user.click(within(editor).getByRole("button", { name: "Lưu thay đổi" }));
    await user.click(await within(editor).findByRole("button", { name: "Mở hồ sơ hiện có" }));
    expect(within(editor).getByText(/Chưa mở được hồ sơ này/)).toBeTruthy();
    expect(screen.getByRole("dialog", { name: employee.fullName })).toBe(editor);
    expect(notes.isConnected).toBe(true);
    expect(notes.value).toBe("Bản nháp chưa lưu");
    expect(service.load).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
  });

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

  it("keeps edited bank and zones through unlink, then saves with the returned version", async () => {
    const { user, editor } = await openEditor();
    fillBank(editor);
    await user.click(within(editor).getByRole("checkbox", { name: "Khu Nam" }));
    const confirmation = await openConfirmation(user, editor);
    await user.click(within(confirmation).getByRole("button", { name: /^Bỏ liên kết$/ }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: "Đã bỏ liên kết" })));
    const unlinked = await currentEmployee();
    expect(unlinked.bankAccount).toBeNull();
    expect(unlinked.workingZoneIds).toEqual(["zone-east"]);
    expect(within(editor).getByRole<HTMLInputElement>("textbox", { name: "Số tài khoản" }).value).toBe("00123456");
    expect(within(editor).getByRole<HTMLInputElement>("checkbox", { name: "Khu Nam" }).checked).toBe(true);
    await user.click(within(editor).getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(service.save).toHaveBeenCalledWith(expect.objectContaining({
      recordVersion: unlinked.recordVersion, workingZoneIds: ["zone-east", "zone-south"],
      bankAccount: { bankName: "Ngân hàng kiểm thử", accountNumber: "00123456", accountHolderName: "NGUYỄN VĂN AN" },
    })));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: "Đã lưu hồ sơ" })));
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

describe("explicit employment changes through the actual editor", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-28T10:00:00Z')); });
  afterEach(() => vi.useRealTimers());

  async function cleanEditor() {
    const opened = await openEditor();
    expect(within(opened.editor).getByRole<HTMLButtonElement>('button', { name: 'Nghỉ việc' }).disabled).toBe(true);
    await opened.user.click(within(opened.editor).getByRole('button', { name: 'Hủy thay đổi' }));
    return opened;
  }
  it('requires saving or discarding the draft and sends only the employment command', async () => {
    const { user, editor, notes } = await cleanEditor();
    expect(notes.value).toBe(employee.notes);
    expect(service.save).not.toHaveBeenCalled();
    expect(within(editor).queryByRole('combobox', { name: 'Trạng thái' })).toBeNull();
    await user.click(within(editor).getByRole('button', { name: 'Nghỉ việc' }));
    const confirm = screen.getByRole('dialog', { name: 'Nghỉ việc?' });
    expect(within(confirm).getByLabelText<HTMLInputElement>('Ngày nghỉ việc').value).toBe('2026-10-28');
    await user.click(within(confirm).getByRole('button', { name: 'Xác nhận nghỉ việc' }));
    await screen.findByRole('dialog', { name: 'Nhắc xử lý tài khoản' });
    expect(screen.getByRole('link', { name: 'Mở tài khoản nội bộ' }).getAttribute('href')).toBe(`/access/accounts?accountId=${encodeURIComponent(employee.account.id)}`);
    expect(service.endEmployment).toHaveBeenCalledExactlyOnceWith({ employeeId: employee.id, recordVersion: employee.recordVersion, endDate: '2026-10-28' });
    expect(repository.snapshotEmployees()[0]).toMatchObject({ status: 'left', employmentEndDate: '2026-10-28', notes: employee.notes, account: employee.account });
    expect(screen.queryByRole('button', { name: /Nguyễn Văn An/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Để sau' }));
    fireEvent.change(screen.getByLabelText('Tình trạng làm việc'), { target: { value: 'left' } });
    await user.click(screen.getByRole('button', { name: /Nguyễn Văn An/ }));
    expect(screen.getByText('Ngày nghỉ: 28/10/2026')).toBeTruthy();
  });

  it('requires confirmation to reinstate and clears the end date without unlocking the account', async () => {
    const former = { ...employee, status: 'left' as const, employmentEndDate: '2026-10-01', account: { ...employee.account, status: 'locked' as const } };
    repository = createMockEmployeeManagementRepository({ accounts: mockEmployeeAccounts.map((account) => account.id === employee.account.id ? former.account : account),
      zones: mockEmployeeZones, initialEmployees: [former], latencyMs: 0 });
    const user = userEvent.setup(); render(<EmployeeManagementExperience />);
    await screen.findByRole('heading', { name: 'Nhân viên' });
    fireEvent.change(screen.getByLabelText('Tình trạng làm việc'), { target: { value: 'left' } });
    await user.click(screen.getByRole('button', { name: /Nguyễn Văn An/ }));
    await user.click(screen.getByRole('button', { name: 'Đi làm lại' }));
    const confirm = screen.getByRole('dialog', { name: 'Đi làm lại?' });
    expect(service.reinstate).not.toHaveBeenCalled();
    await user.click(within(confirm).getByRole('button', { name: 'Xác nhận đi làm lại' }));
    await screen.findByRole('dialog', { name: 'Nhắc kiểm tra quyền truy cập' });
    expect(repository.snapshotEmployees()[0]).toMatchObject({ status: 'employed', employmentEndDate: null, account: { status: 'locked' } });
  });

  it('keeps the employee unchanged when the date is invalid or the confirmation is cancelled', async () => {
    const { user, editor } = await cleanEditor();
    await user.click(within(editor).getByRole('button', { name: 'Nghỉ việc' }));
    const confirm = screen.getByRole('dialog', { name: 'Nghỉ việc?' });
    fireEvent.change(within(confirm).getByLabelText('Ngày nghỉ việc'), { target: { value: '2026-10-29' } });
    fireEvent.submit(within(confirm).getByRole('button', { name: 'Xác nhận nghỉ việc' }).closest('form')!);
    await waitFor(() => expect(within(confirm).getByLabelText('Ngày nghỉ việc').getAttribute('aria-invalid')).toBe('true'));
    expect(service.endEmployment).not.toHaveBeenCalled();
    await user.click(within(confirm).getByRole('button', { name: 'Hủy' }));
    expect(repository.snapshotEmployees()[0]).toEqual(employee);
  });

  it('does not send a command when the date confirmation is cancelled before validation settles', async () => {
    const { user, editor } = await cleanEditor();
    await user.click(within(editor).getByRole('button', { name: 'Nghỉ việc' }));
    const dialog = screen.getByRole('dialog', { name: 'Nghỉ việc?' });
    await act(async () => {
      fireEvent.submit(within(dialog).getByRole('button', { name: 'Xác nhận nghỉ việc' }).closest('form')!);
      fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }));
    });
    expect(service.endEmployment).not.toHaveBeenCalled();
    expect(repository.snapshotEmployees()[0]).toEqual(employee);
    expect(screen.getByRole('dialog', { name: employee.fullName })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Nhắc xử lý tài khoản' })).toBeNull();
  });

  it('does not start a command after unmount during date validation', async () => {
    const { user, editor, unmount } = await cleanEditor();
    await user.click(within(editor).getByRole('button', { name: 'Nghỉ việc' }));
    const dialog = screen.getByRole('dialog', { name: 'Nghỉ việc?' });
    await act(async () => {
      fireEvent.submit(within(dialog).getByRole('button', { name: 'Xác nhận nghỉ việc' }).closest('form')!);
      unmount();
    });
    expect(service.endEmployment).not.toHaveBeenCalled();
    expect(repository.snapshotEmployees()[0]).toEqual(employee);
    expect(notify).not.toHaveBeenCalled();
  });

  it('does not reuse the old confirmation after cancelling and reopening the date dialog', async () => {
    const { user, editor } = await cleanEditor();
    await user.click(within(editor).getByRole('button', { name: 'Nghỉ việc' }));
    const dialog = screen.getByRole('dialog', { name: 'Nghỉ việc?' });
    await act(async () => {
      fireEvent.submit(within(dialog).getByRole('button', { name: 'Xác nhận nghỉ việc' }).closest('form')!);
      fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }));
      fireEvent.click(within(editor).getByRole('button', { name: 'Nghỉ việc' }));
    });
    expect(service.endEmployment).not.toHaveBeenCalled();
    expect(repository.snapshotEmployees()[0]).toEqual(employee);
    const reopened = screen.getByRole('dialog', { name: 'Nghỉ việc?' });
    await user.click(within(reopened).getByRole('button', { name: 'Xác nhận nghỉ việc' }));
    await screen.findByRole('dialog', { name: 'Nhắc xử lý tài khoản' });
    expect(service.endEmployment).toHaveBeenCalledTimes(1);
  });

  it('keeps the date dialog and editor open for MSG11 and preserves the employee', async () => {
    repository = createMockEmployeeManagementRepository({ accounts: mockEmployeeAccounts, zones: mockEmployeeZones, initialEmployees: [employee], latencyMs: 0,
      laborRecords: [{ employeeId: employee.id, date: '2026-10-29', kind: 'attendance' }] });
    const { user, editor } = await cleanEditor();
    await user.click(within(editor).getByRole('button', { name: 'Nghỉ việc' }));
    const confirm = screen.getByRole('dialog', { name: 'Nghỉ việc?' });
    await user.click(within(confirm).getByRole('button', { name: 'Xác nhận nghỉ việc' }));
    expect((await within(confirm).findByRole('alert')).textContent).toContain('1 bản ghi');
    expect(repository.snapshotEmployees()[0]).toEqual(employee);
    expect(screen.getByRole('dialog', { name: employee.fullName })).toBeTruthy();
  });

  it('allows a saved draft before ending and uses the new profile version', async () => {
    const { user, editor } = await openEditor();
    await user.click(within(editor).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: employee.fullName })).toBeNull());
    const saved = repository.snapshotEmployees()[0];
    await user.click(screen.getByRole('button', { name: /Nguyễn Văn An/ }));
    await user.click(screen.getByRole('button', { name: 'Nghỉ việc' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Nghỉ việc?' })).getByRole('button', { name: 'Xác nhận nghỉ việc' }));
    await screen.findByRole('dialog', { name: 'Nhắc xử lý tài khoản' });
    expect(service.endEmployment).toHaveBeenCalledWith({ employeeId: employee.id, recordVersion: saved.recordVersion, endDate: '2026-10-28' });
    expect(repository.snapshotEmployees()[0].notes).toBe('Bản nháp chưa lưu');
  });

  it('publishes active session expiry and does not show an employment success', async () => {
    const expired = vi.fn(); const unsubscribe = sessionExpiryChannel.subscribe(expired);
    try {
      service.endEmployment.mockResolvedValueOnce({ status: 'session-expired', message: { code: 'MSG19' } });
      const { user, editor } = await cleanEditor();
      await user.click(within(editor).getByRole('button', { name: 'Nghỉ việc' }));
      await user.click(within(screen.getByRole('dialog', { name: 'Nghỉ việc?' })).getByRole('button', { name: 'Xác nhận nghỉ việc' }));
      await waitFor(() => expect(expired).toHaveBeenCalledWith({ code: 'MSG19' }));
      expect(repository.snapshotEmployees()[0]).toEqual(employee);
      expect(screen.queryByRole('dialog', { name: 'Nhắc xử lý tài khoản' })).toBeNull();
    } finally { unsubscribe(); }
  });

  it('keeps an unknown result visible without automatically sending the command again', async () => {
    service.endEmployment.mockRejectedValueOnce(new Error('Response unavailable'));
    const { user, editor } = await cleanEditor();
    await user.click(within(editor).getByRole('button', { name: 'Nghỉ việc' }));
    const dialog = screen.getByRole('dialog', { name: 'Nghỉ việc?' });
    await user.click(within(dialog).getByRole('button', { name: 'Xác nhận nghỉ việc' }));
    expect((await within(dialog).findByRole('alert')).textContent).toContain('Chưa xác nhận được kết quả');
    expect(service.endEmployment).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Nhắc xử lý tài khoản' })).toBeNull();
  });

  it('ignores a response after the employee view unmounts without claiming to cancel the command', async () => {
    let finish!: (result: ChangeEmployeeEmploymentResult) => void;
    service.endEmployment.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { user, editor, unmount } = await cleanEditor();
    await user.click(within(editor).getByRole('button', { name: 'Nghỉ việc' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Nghỉ việc?' })).getByRole('button', { name: 'Xác nhận nghỉ việc' }));
    notify.mockClear(); unmount();
    await act(async () => finish({ status: 'changed', employee: { ...employee, status: 'left', employmentEndDate: '2026-10-28' } }));
    expect(notify).not.toHaveBeenCalled();
  });
  it('blocks Escape and duplicate submission immediately when the service takes the command', async () => {
    const { user, editor } = await cleanEditor();
    await user.click(within(editor).getByRole('button', { name: 'Nghỉ việc' }));
    const confirm = screen.getByRole('dialog', { name: 'Nghỉ việc?' });
    let finish!: (result: ChangeEmployeeEmploymentResult) => void;
    service.endEmployment.mockImplementationOnce(() => {
      fireEvent(confirm, new Event('cancel', { cancelable: true }));
      fireEvent(editor, new Event('cancel', { cancelable: true }));
      return new Promise((resolve) => { finish = resolve; });
    });
    await user.click(within(confirm).getByRole('button', { name: 'Xác nhận nghỉ việc' }));
    expect(screen.getByRole('dialog', { name: 'Nghỉ việc?' })).toBeTruthy();
    expect(screen.getByRole('dialog', { name: employee.fullName })).toBeTruthy();
    fireEvent.submit(within(confirm).getByRole('button', { name: 'Đang cập nhật…' }).closest('form')!);
    expect(service.endEmployment).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ status: 'forbidden', message: { code: 'MSG02' } }); });
    await within(confirm).findByRole('alert');
    await user.click(within(confirm).getByRole('button', { name: 'Hủy' }));
    expect(repository.snapshotEmployees()[0]).toEqual(employee);
  });
});
