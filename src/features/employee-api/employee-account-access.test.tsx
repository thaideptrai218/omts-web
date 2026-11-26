// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { employeeDetailFixture } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";

const detail = vi.hoisted(() => vi.fn());
vi.mock("@/features/api-workspace/workspace-repository", async (original) => ({ ...(await original<object>()), createWorkspaceRepository: () => ({ detail }) }));
import { EmployeeAccountTab } from "./employee-account-tab";

const employee = () => employeeViewSchema.parse(employeeDetailFixture());
const accountId = () => employee().account!.id;
const pair = { id: "p1", zoneId: "11111111-1111-4111-8111-111111111111", zoneName: "Vùng nuôi Ngọc Vừng", allZones: false, role: "ZONE_MANAGER", roleName: "Zone Manager" };
const account = (extra: Record<string, unknown> = {}) => ({ id: accountId(), username: "fixture.an", displayName: "Nguyễn An", phoneNumber: "0912345678", email: null, status: "Active", employeeId: employee().id, rowVersion: "rv1", pairs: [pair], ...extra });

beforeEach(() => { detail.mockResolvedValue({ status: "success", data: account() }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("employee login tab (light)", () => {
  it("shows the account name, state and role and zones read only, and opens the account on its own screen", async () => {
    render(<EmployeeAccountTab employee={employee()} onSaved={vi.fn()} canReset />);
    expect(screen.getByText("@fixture.an")).toBeTruthy();
    await screen.findByText("Quản lý vùng");
    expect(screen.getByText("Vùng nuôi Ngọc Vừng")).toBeTruthy();
    expect(screen.getByText("Đang hoạt động")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mở tài khoản" }).getAttribute("href")).toBe(`/workspace/accounts?accountId=${accountId()}`);
    expect(detail).toHaveBeenCalledWith(accountId(), expect.anything());
  });
  it("keeps every account action off this tab: no role editor, password, lock or create", async () => {
    render(<EmployeeAccountTab employee={employee()} onSaved={vi.fn()} canReset />);
    await screen.findByText("Quản lý vùng");
    for (const name of ["Lưu thay đổi", "Đặt lại mật khẩu", "Khóa tài khoản", "Cấp tài khoản", "Xem quyền của vai trò"]) expect(screen.queryByRole("button", { name })).toBeNull();
    expect(document.body.textContent).not.toMatch(/Quản lý người dùng|Sẽ thêm|Sẽ bỏ|Đang giao/);
  });
  it("tells a locked or pending login apart", async () => {
    detail.mockResolvedValue({ status: "success", data: account({ status: "Locked" }) });
    const locked = render(<EmployeeAccountTab employee={employee()} onSaved={vi.fn()} canReset />);
    expect(await screen.findByText("Đã khóa")).toBeTruthy();
    locked.unmount();
    detail.mockResolvedValue({ status: "success", data: account({ mustChangePassword: true }) });
    render(<EmployeeAccountTab employee={employee()} onSaved={vi.fn()} canReset />);
    expect(await screen.findByText("Chờ đổi mật khẩu")).toBeTruthy();
  });
  it("says so when the role cannot be read, without hiding the account name", async () => {
    detail.mockResolvedValue({ status: "error", httpStatus: 500, uncertain: false });
    render(<EmployeeAccountTab employee={employee()} onSaved={vi.fn()} canReset />);
    expect(await screen.findByText("Chưa đọc được")).toBeTruthy();
    expect(within(document.body).getByText("@fixture.an")).toBeTruthy();
  });
  it("shows a viewer who is not the Owner the plain facts only, with no link", () => {
    render(<EmployeeAccountTab employee={employee()} onSaved={vi.fn()} />);
    expect(screen.getByText("@fixture.an")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Mở tài khoản" })).toBeNull();
    expect(detail).not.toHaveBeenCalled();
  });
});
