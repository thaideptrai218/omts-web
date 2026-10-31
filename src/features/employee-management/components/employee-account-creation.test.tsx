// @vitest-environment jsdom
import React from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmployeeManagementExperience } from "./employee-management-experience";
import { createMockManagementEnvironment } from "@/shared/mocks/mock-management-environment";
import { employeeManagementService } from "../services/employee-management-service.instance";
import type { CreateEmployeeAccountResult } from "../domain/employee-account-creation";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("@/features/auth/state/auth-provider", () => ({ useAuth: () => ({ state: { status: "authenticated", account: { accountId: "owner", access: {} } } }) }));
vi.mock("@/features/access/lib/has-effective-permission", () => ({ hasEffectivePermission: () => true }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify }) }));
vi.mock("../services/employee-management-service.instance", () => ({ employeeManagementService: {
  load: vi.fn(), save: vi.fn(), unlinkAccount: vi.fn(), endEmployment: vi.fn(), reinstate: vi.fn(), createLoginAccount: vi.fn(),
} }));
let environment: ReturnType<typeof createMockManagementEnvironment>;
const service = vi.mocked(employeeManagementService);
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks(); environment = createMockManagementEnvironment(0);
  service.load.mockImplementation(() => environment.employees.load());
  service.save.mockImplementation((input) => environment.employees.save(input));
  service.createLoginAccount.mockImplementation((input) => environment.employees.createLoginAccount(input));
});
async function openEditor() {
  const user = userEvent.setup(); const view = render(<EmployeeManagementExperience />);
  await user.click(await screen.findByRole("button", { name: /Lê Thị Lan/ }));
  return { user, ...view, editor: screen.getByRole("dialog", { name: "Lê Thị Lan" }) };
}
async function openCreation() {
  const view = await openEditor();
  await view.user.click(within(view.editor).getByRole("button", { name: "Tạo tài khoản đăng nhập" }));
  return { ...view, dialog: screen.getByRole("dialog", { name: "Tạo tài khoản cho Lê Thị Lan" }) };
}
async function preview(view: Awaited<ReturnType<typeof openCreation>>) {
  await view.user.selectOptions(within(view.dialog).getByRole("combobox", { name: /^Vùng/ }), "zone-south");
  await view.user.selectOptions(within(view.dialog).getByRole("combobox", { name: /^Vai trò/ }), "role-staff");
  await view.user.click(within(view.dialog).getByRole("button", { name: "Thêm dòng quyền" }));
  await view.user.click(within(view.dialog).getByRole("button", { name: "Xem quyền trước khi tạo" }));
  return within(view.dialog).findByRole("button", { name: "Xác nhận tạo tài khoản" });
}

describe("create a login account after saving the employee profile", () => {
  it("requires a clean saved profile and pre-fills contacts without choosing permissions", async () => {
    const { user, editor } = await openEditor();
    fireEvent.change(within(editor).getByRole("textbox", { name: "Ghi chú" }), { target: { value: "Chưa lưu" } });
    expect(within(editor).getByRole<HTMLButtonElement>("button", { name: "Tạo tài khoản đăng nhập" }).disabled).toBe(true);
    await user.click(within(editor).getByRole("button", { name: "Hủy thay đổi" }));
    await user.click(within(editor).getByRole("button", { name: "Tạo tài khoản đăng nhập" }));
    const dialog = screen.getByRole("dialog", { name: "Tạo tài khoản cho Lê Thị Lan" });
    expect(within(dialog).getByLabelText<HTMLInputElement>("Tên hiển thị").value).toBe("Lê Thị Lan");
    expect(within(dialog).getByLabelText<HTMLInputElement>("Số điện thoại nhận thông tin").value).toBe("0914555666");
    expect(within(dialog).queryByRole("textbox", { name: /mật khẩu|username/i })).toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "Xem quyền trước khi tạo" }));
    expect((await within(dialog).findByRole("alert")).textContent).toContain("ít nhất một cặp");
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole("group", { name: "Thiết lập phân quyền" })));
    expect(service.createLoginAccount).not.toHaveBeenCalled(); expect(service.save).not.toHaveBeenCalled();
  });
  it("creates and links once, shows a secret-free receipt, and reloads the linked profile", async () => {
    const view = await openCreation(); const confirm = await preview(view);
    expect(service.createLoginAccount).not.toHaveBeenCalled();
    await view.user.click(confirm);
    const receipt = await screen.findByRole("dialog", { name: "Đã tạo tài khoản" });
    expect(service.createLoginAccount).toHaveBeenCalledTimes(1);
    expect(within(receipt).queryByRole("textbox")).toBeNull();
    expect(within(receipt).getByRole("button", { name: "Sao chép username" })).toBeTruthy();
    expect(environment.employees.snapshotEmployees()[1].account?.username).toMatch(/^le\.thi\.lan\./);
    await view.user.click(within(receipt).getByRole("button", { name: "Đã hiểu" }));
    await view.user.click(screen.getByRole("button", { name: /Lê Thị Lan/ }));
    expect(screen.queryByRole("button", { name: "Tạo tài khoản đăng nhập" })).toBeNull();
    expect(screen.getByRole("button", { name: "Bỏ liên kết tài khoản" })).toBeTruthy();
  });
  it("cancels without creating an account or saving personal fields", async () => {
    const view = await openCreation(); const before = environment.accounts.snapshotAccounts();
    await view.user.click(within(view.dialog).getByRole("button", { name: "Hủy" }));
    expect(service.createLoginAccount).not.toHaveBeenCalled(); expect(service.save).not.toHaveBeenCalled();
    expect(environment.accounts.snapshotAccounts()).toEqual(before);
    expect(screen.getByRole("dialog", { name: "Lê Thị Lan" })).toBeTruthy();
  });
  it("keeps duplicate contact errors and the grant draft without linking the duplicate", async () => {
    const view = await openCreation();
    fireEvent.change(within(view.dialog).getByLabelText("Số điện thoại nhận thông tin"), { target: { value: "0901234567" } });
    await view.user.click(await preview(view));
    await within(view.dialog).findByRole("button", { name: "Xem quyền trước khi tạo" });
    expect(within(view.dialog).getByLabelText("Số điện thoại nhận thông tin").getAttribute("aria-invalid")).toBe("true");
    expect(within(view.dialog).getByRole("button", { name: "Bỏ dòng" })).toBeTruthy();
    expect(environment.employees.snapshotEmployees()[1].account).toBeNull();
  });

  it("blocks child/parent Escape and a repeated submit as soon as the command starts", async () => {
    const view = await openCreation(); const confirm = await preview(view);
    let finish!: (result: CreateEmployeeAccountResult) => void;
    service.createLoginAccount.mockImplementationOnce(() => {
      fireEvent(view.dialog, new Event("cancel", { bubbles: true, cancelable: true }));
      fireEvent(view.editor, new Event("cancel", { bubbles: true, cancelable: true }));
      return new Promise((resolve) => { finish = resolve; });
    });
    await view.user.click(confirm);
    expect(screen.getByRole("dialog", { name: "Tạo tài khoản cho Lê Thị Lan" })).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Lê Thị Lan" })).toBeTruthy();
    fireEvent.submit(within(view.dialog).getByRole("button", { name: "Đang tạo tài khoản…" }).closest("form")!);
    expect(service.createLoginAccount).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ status: "forbidden", message: { code: "MSG02" } }); });
    await within(view.dialog).findByRole("alert");
    await view.user.click(within(view.dialog).getByRole("button", { name: "Hủy" }));
    expect(environment.employees.snapshotEmployees()[1].account).toBeNull();
  });
  it("discards late MSG19 after unmount instead of expiring a later screen", async () => {
    const expired = vi.fn(); const unsubscribe = sessionExpiryChannel.subscribe(expired);
    try {
      const view = await openCreation(); const confirm = await preview(view);
      let finish!: (result: CreateEmployeeAccountResult) => void;
      service.createLoginAccount.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
      await view.user.click(confirm); view.unmount();
      await act(async () => { finish({ status: "session-expired", message: { code: "MSG19" } }); });
      expect(expired).not.toHaveBeenCalled(); expect(notify).not.toHaveBeenCalled();
    } finally { unsubscribe(); }
  });
  it("reports a lost response without resending or falsely showing a delivery receipt", async () => {
    const view = await openCreation(); const confirm = await preview(view);
    service.createLoginAccount.mockImplementationOnce(async (input) => {
      await environment.employees.createLoginAccount(input); throw new Error("Lost after commit");
    });
    await view.user.click(confirm);
    expect((await within(view.dialog).findByRole("alert")).textContent).toContain("Chưa xác nhận được kết quả");
    expect(environment.employees.snapshotEmployees()[1].account).not.toBeNull();
    expect(service.createLoginAccount).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "Đã tạo tài khoản" })).toBeNull();
    expect(notify).not.toHaveBeenCalled();
  });
});
