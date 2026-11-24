// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
const create = vi.hoisted(() => vi.fn());
vi.mock("./user-management-repository", () => ({ createUserAccount: create }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { UserCreateForm } from "./user-create-form";
import { emptyGrantSelection } from "./user-grant-selection";
import type { UserAccount } from "./user-account-model";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const zoneId = "11111111-1111-4111-8111-111111111111";
const existingAccountant: UserAccount = { id: "kt", username: "ketoan", displayName: "Kế toán Lan", phoneNumber: null, email: null, status: "Active", employeeId: null, rowVersion: "v",
  pairs: [{ id: "p", zoneId: null, zoneName: null, allZones: true, role: "ACCOUNTANT", roleName: "Kế toán" }] };
const credential = { account: { id: "22222222-2222-4222-8222-222222222222", username: "quanlyvung2", displayName: "Quản lý 2" }, temporaryPassword: "Tmp#1", temporaryPasswordExpiresAt: "2026-11-21T10:00:00+07:00" };

function setup(accounts: UserAccount[], onCreated = vi.fn()) {
  render(<UserCreateForm accounts={accounts} zones={[{ id: zoneId, name: "Vùng A" }]} employees={new Map()} initial={{ title: "Tạo người dùng", grants: emptyGrantSelection }} onClose={vi.fn()} onCreated={onCreated} />);
  fireEvent.change(screen.getByLabelText("Tên hiển thị *"), { target: { value: "Quản lý 2" } });
  fireEvent.change(screen.getByLabelText("Tên đăng nhập *"), { target: { value: "quanlyvung2" } });
  fireEvent.change(screen.getByLabelText("Số điện thoại *"), { target: { value: "0912345678" } });
  return onCreated;
}

describe("create user form", () => {
  it("marks each empty required field with aria-invalid and its own message", () => {
    render(<UserCreateForm accounts={[]} zones={[]} employees={new Map()} initial={{ title: "Tạo người dùng", grants: emptyGrantSelection }} onClose={vi.fn()} onCreated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    for (const label of ["Tên hiển thị *", "Tên đăng nhập *", "Số điện thoại *"]) {
      const input = screen.getByLabelText(label);
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toMatch(/^Vui lòng nhập/);
    }
    expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBeNull();
    fireEvent.change(screen.getByLabelText("Tên hiển thị *"), { target: { value: "An" } });
    expect(screen.getByLabelText("Tên hiển thị *").getAttribute("aria-invalid")).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });
  it("creates the account with its zones inline and hands over the credential", async () => {
    create.mockResolvedValue({ status: "success", data: credential });
    const onCreated = setup([]);
    fireEvent.click(screen.getByLabelText("Quản lý vùng")); fireEvent.click(screen.getByRole("button", { name: "Vùng A" }));
    expect(screen.getByText(/Sẽ cấp: tài khoản quanlyvung2, vai trò Quản lý vùng, vùng Vùng A/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(credential));
    expect(create).toHaveBeenCalledWith({ displayName: "Quản lý 2", username: "quanlyvung2", phoneNumber: "0912345678", email: null, employeeId: null, grants: [{ zoneId, role: "ZONE_MANAGER" }] });
  });
  it("behaves like radio cards: one role at a time and zone chips only for Quản lý vùng", () => {
    setup([]);
    expect(screen.queryByRole("button", { name: "Tất cả vùng" })).toBeNull();
    fireEvent.click(screen.getByLabelText("Quản lý vùng"));
    expect(screen.getByRole("button", { name: "Tất cả vùng" }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByLabelText("Kế toán"));
    expect((screen.getByLabelText("Quản lý vùng") as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByRole("button", { name: "Tất cả vùng" })).toBeNull();
    fireEvent.click(screen.getByLabelText("Chưa phân quyền"));
    expect((screen.getByLabelText("Kế toán") as HTMLInputElement).checked).toBe(false);
  });
  it("warns before a second Accountant and continues on OK (never blocks)", async () => {
    create.mockResolvedValue({ status: "success", data: credential });
    const onCreated = setup([existingAccountant]);
    fireEvent.click(screen.getByLabelText("Kế toán"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await screen.findByText(/Hợp tác xã đã có Kế toán: Kế toán Lan/);
    expect(create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(create.mock.calls[0][0].grants).toEqual([{ zoneId: null, role: "ACCOUNTANT" }]);
  });
  it("cancelling the warning creates nothing", async () => {
    setup([existingAccountant]);
    fireEvent.click(screen.getByLabelText("Kế toán")); fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Quay lại" }));
    await waitFor(() => expect(screen.queryByText(/Hợp tác xã đã có Kế toán/)).toBeNull());
    expect(create).not.toHaveBeenCalled();
  });
  it("asks for a zone when Quản lý vùng has none and rejects a bad phone number", async () => {
    setup([]);
    fireEvent.click(screen.getByLabelText("Quản lý vùng")); fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await screen.findByText(/Chọn ít nhất một vùng/);
    fireEvent.change(screen.getByLabelText("Số điện thoại *"), { target: { value: "123" } }); fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await screen.findByText(/10 chữ số/);
    expect(create).not.toHaveBeenCalled();
  });
});
