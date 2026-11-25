// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { employeeDetailFixture } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";

const read = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());
const revoke = vi.hoisted(() => vi.fn());
const options = vi.hoisted(() => vi.fn());
const detail = vi.hoisted(() => vi.fn());
const mutate = vi.hoisted(() => vi.fn());
vi.mock("@/features/personal-api/account-grants-repository", () => ({ readAccountGrants: read, createAccountGrant: create, revokeAccountGrant: revoke }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: options }));
vi.mock("@/features/api-workspace/workspace-repository", async (original) => ({ ...(await original<object>()), createWorkspaceRepository: () => ({ detail, mutate }) }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { EmployeeAccountTab } from "./employee-account-tab";
import { EmployeeUnlinkedAccounts } from "./employee-unlinked-accounts";
import { toUserAccount } from "@/features/account-access/user-account-model";

const ngoc = "11111111-1111-4111-8111-111111111111", thai = "22222222-2222-4222-8222-222222222222";
const employee = () => employeeViewSchema.parse(employeeDetailFixture());
const accountId = () => employee().account!.id;
const grantRow = (id: string, zoneId: string | null, zoneName: string | null, state = "Effective") => ({ id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${id}`, roleId: "44444444-4444-4444-8444-444444444444", roleName: "Zone Manager", role: "ZONE_MANAGER", zoneId, zoneName, allZones: zoneId === null,
  grantedAt: "2026-11-18T21:05:00+07:00", grantedByAccountId: "55555555-5555-4555-8555-555555555555", state, revokedAt: null, revokeReason: null });
const pair = { id: "p1", zoneId: ngoc, zoneName: "Vùng nuôi Ngọc Vừng", allZones: false, role: "ZONE_MANAGER", roleName: "Zone Manager" };
const account = (extra: Record<string, unknown> = {}) => ({ id: accountId(), username: "fixture.an", displayName: "Nguyễn An", phoneNumber: "0912345678", email: null, status: "Active", employeeId: employee().id, rowVersion: "rv1", pairs: [pair], ...extra });

beforeEach(() => {
  read.mockResolvedValue({ status: "success", data: [grantRow("1", ngoc, "Vùng nuôi Ngọc Vừng")] });
  options.mockImplementation(async (resource: string) => resource === "zones"
    ? { status: "success", data: [{ id: ngoc, name: "Vùng nuôi Ngọc Vừng", statusId: 101 }, { id: thai, name: "Thái Đẹp Trai Pro Max", statusId: 101 }] }
    : resource === "accounts" ? { status: "success", data: [account()] } : { status: "success", data: [] });
  detail.mockResolvedValue({ status: "success", data: account() });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("employee login tab: role and zones", () => {
  it("shows the current role and zones, then adds one zone without sending the zone already held", async () => {
    create.mockResolvedValue({ status: "success", data: grantRow("2", thai, "Thái Đẹp Trai Pro Max") });
    const changed = vi.fn();
    render(<EmployeeAccountTab employee={employee()} onSaved={vi.fn()} onAccountChanged={changed} canReset />);
    const current = await screen.findByRole("region", { name: "Vai trò hiện tại" });
    await waitFor(() => expect(within(current).getByText("Quản lý vùng")).toBeTruthy());
    expect(within(current).getByText("Vùng nuôi Ngọc Vừng")).toBeTruthy();
    const held = await screen.findByRole("button", { name: /Vùng nuôi Ngọc Vừng/ });
    expect(held.textContent).toMatch(/Đang phụ trách/);
    fireEvent.click(await screen.findByRole("button", { name: /Thái Đẹp Trai Pro Max/ }));
    expect(screen.getByText("Khi lưu: thêm vùng Thái Đẹp Trai Pro Max.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await screen.findByText("Đã thêm: Thái Đẹp Trai Pro Max.");
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(accountId(), thai, "ZONE_MANAGER");
    expect(revoke).not.toHaveBeenCalled();
    await waitFor(() => expect(changed).toHaveBeenCalled());
  });

  it("locks the login with a reason and reports the change", async () => {
    mutate.mockResolvedValue({ status: "success", data: account({ status: "Locked", rowVersion: "rv2" }) });
    const changed = vi.fn();
    render(<EmployeeAccountTab employee={employee()} onSaved={vi.fn()} onAccountChanged={changed} canReset />);
    fireEvent.click(await screen.findByRole("button", { name: "Khóa tài khoản" }));
    const dialog = screen.getByRole("dialog", { name: "Khóa tài khoản?" });
    fireEvent.change(within(dialog).getByLabelText("Lý do khóa *"), { target: { value: "Nghỉ việc" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Khóa tài khoản" }));
    await screen.findByText("Đã khóa tài khoản.");
    expect(mutate).toHaveBeenCalledWith("lock", { reason: "Nghỉ việc" }, accountId());
    expect(changed).toHaveBeenCalled();
  });

  it("warns, never blocks, before a second Accountant", async () => {
    options.mockImplementation(async (resource: string) => resource === "accounts"
      ? { status: "success", data: [account(), { ...account({ id: "99999999-9999-4999-8999-999999999999", username: "ketoan1", displayName: "Kế toán Lan", employeeId: null, pairs: [{ ...pair, id: "p9", zoneId: null, allZones: true, role: "ACCOUNTANT", roleName: "Accountant" }] }) }] }
      : { status: "success", data: resource === "zones" ? [{ id: ngoc, name: "Vùng nuôi Ngọc Vừng", statusId: 101 }] : [] });
    create.mockResolvedValue({ status: "success", data: grantRow("3", null, null) });
    render(<EmployeeAccountTab employee={employee()} onSaved={vi.fn()} canReset />);
    fireEvent.click(await screen.findByRole("button", { name: "Cho làm Kế toán" }));
    expect(await screen.findByText(/Hợp tác xã đã có Kế toán là Kế toán Lan/)).toBeTruthy();
  });

  it("opens the read-only role list from the tab", async () => {
    render(<EmployeeAccountTab employee={employee()} onSaved={vi.fn()} canReset />);
    fireEvent.click(await screen.findByRole("button", { name: "Xem quyền của vai trò" }));
    const dialog = await screen.findByRole("dialog", { name: "Quyền của vai trò" });
    expect(within(dialog).getByRole("heading", { name: "Quản lý vùng" })).toBeTruthy();
    expect(within(dialog).getByRole("heading", { name: "Kế toán" })).toBeTruthy();
  });

  it("keeps the old developer words out of the tab", async () => {
    render(<EmployeeAccountTab employee={employee()} onSaved={vi.fn()} canReset />);
    await screen.findByRole("button", { name: "Lưu thay đổi" });
    expect(document.body.textContent).not.toMatch(/Quản lý người dùng|Sẽ thêm|Sẽ bỏ|Đang giao/);
  });
});

describe("logins that no employee holds", () => {
  it("lists only those logins and opens the same role and zone editor", async () => {
    const free = toUserAccount(account({ id: "88888888-8888-4888-8888-888888888888", username: "quanlyvung1", displayName: "Quản lý vùng 1", employeeId: null }));
    const held = toUserAccount(account());
    detail.mockResolvedValue({ status: "success", data: account({ id: free.id, username: free.username, employeeId: null }) });
    render(<EmployeeUnlinkedAccounts accounts={[free, held]} search="" onChanged={vi.fn()} />);
    expect(screen.getByText("quanlyvung1")).toBeTruthy();
    expect(screen.queryByText("fixture.an")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mở tài khoản Quản lý vùng 1" }));
    expect(await screen.findByRole("button", { name: "Lưu thay đổi" })).toBeTruthy();
    expect(read).toHaveBeenCalledWith(free.id, expect.anything());
  });

  it("says so when every login belongs to an employee", () => {
    render(<EmployeeUnlinkedAccounts accounts={[toUserAccount(account())]} search="" onChanged={vi.fn()} />);
    expect(screen.getByText("Mọi tài khoản đều đã gắn với nhân viên.")).toBeTruthy();
  });
});
