// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const ids = { self: "99999999-9999-4999-8999-999999999999", ngoc: "11111111-1111-4111-8111-111111111111", minh: "22222222-2222-4222-8222-222222222222", emp: "33333333-3333-4333-8333-333333333333" };
const mocks = vi.hoisted(() => ({ query: "", subject: "CooperativeOwner", accountId: "", accounts: [] as Record<string, unknown>[], deleted: [] as Record<string, unknown>[],
  detail: vi.fn(), mutate: vi.fn(), create: vi.fn(), reset: vi.fn(), loadOptions: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(mocks.query) }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/components/ui/screen-guide", () => ({ ScreenGuide: () => null }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: mocks.subject, accountId: mocks.accountId } }) }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: mocks.loadOptions }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read: async () => ({ status: "success", data: { items: [{ id: ids.emp, code: "NV1", fullName: "Nguyễn Văn An", phoneNumber: "0900000001", employeeType: "Staff", account: null }], page: 1, pageSize: 100, total: 1 } }) }) }));
vi.mock("@/features/api-workspace/workspace-repository", async (original) => ({ ...(await original<object>()), createWorkspaceRepository: () => ({ detail: mocks.detail, mutate: mocks.mutate }) }));
vi.mock("@/features/account-access/user-management-repository", () => ({ createStaffAccount: mocks.create, resetAccountPassword: mocks.reset }));
vi.mock("@/features/account-access/user-grant-editor", () => ({ UserGrantEditor: () => <p>Bộ chọn vai trò và vùng</p> }));
import { UserAccountsScreen } from "./user-accounts-screen";

const pair = (role: string, zoneId: string | null, zoneName: string | null) => ({ id: `${role}-${zoneId}`, zoneId, zoneName, allZones: !zoneId, role, roleName: role });
const account = (id: string, username: string, displayName: string, extra: Record<string, unknown> = {}) =>
  ({ id, username, displayName, phoneNumber: "0900000000", email: null, status: "Active", mustChangePassword: false, employeeId: null, pairs: [], rowVersion: `rv-${id}`, note: null, deleted: false, ...extra });
const quanLy = account("a1", "quanlyvung1", "Lê Minh Tuấn", { pairs: [pair("ZONE_MANAGER", ids.ngoc, "Ngọc Vừng"), pair("ZONE_MANAGER", ids.minh, "Minh Châu")], employeeId: ids.emp });
const keToan = account("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "ketoan1", "Phạm Kế Toán", { pairs: [pair("ACCOUNTANT", null, null)], email: "ketoan@example.com" });
const locked = account("a3", "bi.khoa", "Bị Khóa", { status: "Locked" });
const pending = account("a4", "moi.tao", "Mới Tạo", { mustChangePassword: true });
const gone = account("a5", "da.xoa", "Đã Xóa", { status: "Deleted", deleted: true });
const owner = account(ids.self, "owner", "Chủ HTX", { subjectType: "CooperativeOwner" });
const row = (name: string) => screen.getByRole("button", { name: `Mở tài khoản ${name}` }).closest("tr")!;
const zones = [{ id: ids.ngoc, name: "Ngọc Vừng", statusId: 101 }, { id: ids.minh, name: "Minh Châu", statusId: 101 }];

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  Object.assign(mocks, { query: "", subject: "CooperativeOwner", accountId: ids.self, accounts: [quanLy, keToan, locked, pending], deleted: [gone] });
  mocks.loadOptions.mockImplementation(async (resource: string, _signal: unknown, query: Record<string, string> = {}) =>
    ({ status: "success", data: resource === "zones" ? zones : resource === "accounts" ? [...mocks.accounts, ...(query.includeDeleted ? mocks.deleted : [])] : [] }));
  mocks.detail.mockImplementation(async (id: string) => ({ status: "success", data: [...mocks.accounts, ...mocks.deleted, owner].find((item) => item.id === id) }));
});
afterEach(cleanup);

describe("Tài khoản người dùng list", () => {
  it("shows name, login, phone, email, role chips, linked employee and state of each account", async () => {
    render(<UserAccountsScreen />);
    await screen.findByRole("button", { name: "Mở tài khoản Lê Minh Tuấn" });
    const first = within(row("Lê Minh Tuấn"));
    expect(first.getByText("quanlyvung1")).toBeTruthy();
    // One chip per role: the role, then its zones in a single line.
    expect(first.getByText("Quản lý vùng", { selector: "strong" }).parentElement?.textContent).toBe("Quản lý vùng: Ngọc Vừng, Minh Châu");
    await waitFor(() => expect(first.getByRole("link", { name: "Nguyễn Văn An" })).toBeTruthy());
    expect(within(row("Phạm Kế Toán")).getByText("Kế toán", { selector: "strong" }).parentElement?.textContent).toBe("Kế toán: tất cả vùng");
    expect(within(row("Phạm Kế Toán")).getByText("Không gắn nhân viên")).toBeTruthy();
    expect(within(row("Bị Khóa")).getByText("Đã khóa")).toBeTruthy();
    expect(within(row("Mới Tạo")).getByText("Chờ đổi mật khẩu")).toBeTruthy();
    expect(within(row("Lê Minh Tuấn")).getByText("Đang hoạt động")).toBeTruthy();
    expect(screen.queryByText("Đã Xóa")).toBeNull();
  });
  it("shows 10 rows a page with the 10/30/50 choice, and the other page on request", async () => {
    mocks.accounts = Array.from({ length: 12 }, (_, index) => account(`b${index}`, `user${index}`, `Người ${String(index).padStart(2, "0")}`));
    render(<UserAccountsScreen />);
    await screen.findByRole("button", { name: "Mở tài khoản Người 00" });
    expect(screen.getAllByRole("button", { name: /^Mở tài khoản / })).toHaveLength(10);
    expect(screen.getByText("1–10 trong 12 tài khoản")).toBeTruthy();
    expect(within(screen.getByRole("navigation", { name: "Phân trang" })).getAllByRole("option").map((option) => option.textContent)).toEqual(["10 dòng", "30 dòng", "50 dòng"]);
    fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    expect(screen.getAllByRole("button", { name: /^Mở tài khoản / })).toHaveLength(2);
  });
  it("filters by role, zone, state and linked employee, and clears them", async () => {
    render(<UserAccountsScreen />);
    await screen.findByRole("button", { name: "Mở tài khoản Lê Minh Tuấn" });
    fireEvent.click(screen.getByLabelText("Kế toán"));
    expect(screen.getAllByRole("button", { name: /^Mở tài khoản / }).map((button) => button.textContent)).toEqual(["Phạm Kế Toán"]);
    fireEvent.click(screen.getByLabelText("Chưa có vai trò"));
    expect(screen.getAllByRole("button", { name: /^Mở tài khoản / }).map((button) => button.textContent)).toEqual(["Bị Khóa", "Mới Tạo"]);
    fireEvent.click(screen.getByLabelText("Tất cả", { selector: "input[name=account-role]" }));
    fireEvent.change(screen.getByLabelText("Vùng"), { target: { value: ids.minh } });
    expect(screen.getAllByRole("button", { name: /^Mở tài khoản / }).map((button) => button.textContent)).toEqual(["Lê Minh Tuấn", "Phạm Kế Toán"]);
    fireEvent.click(screen.getByLabelText("Có", { selector: "input[name=account-employee]" }));
    expect(screen.getAllByRole("button", { name: /^Mở tài khoản / }).map((button) => button.textContent)).toEqual(["Lê Minh Tuấn"]);
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại" }));
    fireEvent.click(screen.getByLabelText("Đã khóa"));
    expect(screen.getAllByRole("button", { name: /^Mở tài khoản / }).map((button) => button.textContent)).toEqual(["Bị Khóa"]);
    fireEvent.click(screen.getByLabelText("Chờ đổi mật khẩu", { selector: "input[name=account-state]" }));
    expect(screen.getAllByRole("button", { name: /^Mở tài khoản / }).map((button) => button.textContent)).toEqual(["Mới Tạo"]);
  });
  it("searches login name, name, phone and email", async () => {
    render(<UserAccountsScreen />);
    await screen.findByRole("button", { name: "Mở tài khoản Lê Minh Tuấn" });
    const search = screen.getByRole("searchbox", { name: "Tìm tài khoản" });
    fireEvent.change(search, { target: { value: "ketoan@example" } });
    expect(screen.getAllByRole("button", { name: /^Mở tài khoản / }).map((button) => button.textContent)).toEqual(["Phạm Kế Toán"]);
    fireEvent.change(search, { target: { value: "quanlyvung1" } });
    expect(screen.getAllByRole("button", { name: /^Mở tài khoản / }).map((button) => button.textContent)).toEqual(["Lê Minh Tuấn"]);
    fireEvent.change(search, { target: { value: "khong co ai" } });
    expect(screen.getByText("Không có tài khoản phù hợp bộ lọc.")).toBeTruthy();
  });
  it("shows deleted accounts only with the switch on, and reads them from the server then", async () => {
    render(<UserAccountsScreen />);
    await screen.findByRole("button", { name: "Mở tài khoản Lê Minh Tuấn" });
    expect(mocks.loadOptions).not.toHaveBeenCalledWith("accounts", expect.anything(), { includeDeleted: "true" });
    fireEvent.click(screen.getByRole("switch", { name: "Hiện cả tài khoản đã xóa" }));
    expect(await screen.findByRole("button", { name: "Mở tài khoản Đã Xóa" })).toBeTruthy();
    expect(mocks.loadOptions).toHaveBeenCalledWith("accounts", expect.anything(), { includeDeleted: "true" });
    expect(within(row("Đã Xóa")).getByText("Đã xóa")).toBeTruthy();
  });
  it("adds the optional note column from the column picker and sorts by a header", async () => {
    mocks.accounts = [account("n1", "z.user", "Zeta", { note: "Giữ máy chung" }), account("n2", "a.user", "Alpha")];
    render(<UserAccountsScreen />);
    await screen.findByRole("button", { name: "Mở tài khoản Zeta" });
    expect(screen.queryByRole("columnheader", { name: "Ghi chú" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Chọn trường hiển thị" }));
    fireEvent.click(screen.getByLabelText("Ghi chú"));
    expect(screen.getByText("Giữ máy chung")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tên hiển thị" }));
    expect(screen.getAllByRole("button", { name: /^Mở tài khoản / }).map((button) => button.textContent)).toEqual(["Alpha", "Zeta"]);
  });
  it("keeps everyone but the Owner out", () => {
    mocks.subject = "Staff";
    render(<UserAccountsScreen />);
    expect(screen.queryByRole("searchbox", { name: "Tìm tài khoản" })).toBeNull();
    expect(mocks.loadOptions).not.toHaveBeenCalled();
  });
});

describe("create account", () => {
  const open = async () => { render(<UserAccountsScreen />); await screen.findByRole("button", { name: "Mở tài khoản Lê Minh Tuấn" }); fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" })); return within(screen.getByRole("dialog", { name: "Tạo tài khoản người dùng" })); };
  const credential = { account: { id: "new-id", username: "tran.binh", displayName: "Trần Bình" }, temporaryPassword: "Tmp-Secret-1!", temporaryPasswordExpiresAt: "2026-11-27T12:00:00+07:00" };
  const fill = (dialog: ReturnType<typeof within>) => {
    fireEvent.change(dialog.getByLabelText("Tên hiển thị *"), { target: { value: "Trần Bình" } });
    fireEvent.change(dialog.getByLabelText("Điện thoại *"), { target: { value: "0912345678" } });
  };
  it("creates without an employee and without a role, then shows the password once", async () => {
    mocks.create.mockResolvedValue({ status: "success", data: credential });
    const dialog = await open();
    expect(dialog.getByText("Hệ thống tạo mật khẩu tạm, hiện một lần sau khi lưu.")).toBeTruthy();
    fill(dialog);
    expect((dialog.getByLabelText("Tên đăng nhập *") as HTMLInputElement).value).toBe("tran.binh");
    fireEvent.submit(dialog.getByRole("button", { name: "Lưu" }).closest("form")!);
    expect(await screen.findByText("Tmp-Secret-1!")).toBeTruthy();
    expect(mocks.create).toHaveBeenCalledWith({ displayName: "Trần Bình", username: "tran.binh", phoneNumber: "0912345678", email: null, employeeId: null, grants: [], note: null });
    fireEvent.click(screen.getByRole("button", { name: "Đã bàn giao, đóng" }));
    expect(screen.queryByText("Tmp-Secret-1!")).toBeNull();
    expect(await screen.findByText("Đã tạo tài khoản tran.binh.")).toBeTruthy();
    expect(mocks.loadOptions.mock.calls.filter(([resource]) => resource === "accounts").length).toBeGreaterThan(1);
  });
  it("offers only Staff without an account, links the chosen one and sends several role rows", async () => {
    mocks.create.mockResolvedValue({ status: "success", data: credential });
    const dialog = await open();
    await waitFor(() => expect(dialog.getByRole("option", { name: /Nguyễn Văn An/ })).toBeTruthy());
    fireEvent.change(dialog.getByLabelText("Gắn với nhân viên"), { target: { value: ids.emp } });
    expect((dialog.getByLabelText("Tên hiển thị *") as HTMLInputElement).value).toBe("Nguyễn Văn An");
    expect((dialog.getByLabelText("Điện thoại *") as HTMLInputElement).value).toBe("0900000001");
    fireEvent.change(dialog.getByLabelText("Vai trò của dòng 1"), { target: { value: "ZONE_MANAGER" } });
    await waitFor(() => expect(dialog.getByRole("button", { name: "Ngọc Vừng" })).toBeTruthy());
    fireEvent.click(dialog.getByRole("button", { name: "Ngọc Vừng" }));
    fireEvent.click(dialog.getByRole("button", { name: "+ Thêm phân quyền" }));
    // A zone appears once: Ngọc Vừng is no longer offered in the second row.
    fireEvent.change(dialog.getByLabelText("Vai trò của dòng 2"), { target: { value: "ZONE_MANAGER" } });
    expect(dialog.getAllByRole("button", { name: "Ngọc Vừng" })).toHaveLength(1);
    fireEvent.click(dialog.getAllByRole("button", { name: "Minh Châu" })[1]);
    fireEvent.click(dialog.getByRole("button", { name: "+ Thêm phân quyền" }));
    fireEvent.change(dialog.getByLabelText("Vai trò của dòng 3"), { target: { value: "ACCOUNTANT" } });
    expect(dialog.getByText("Kế toán làm việc ở tất cả vùng.")).toBeTruthy();
    fireEvent.submit(dialog.getByRole("button", { name: "Lưu" }).closest("form")!);
    // A second Kế toán only warns; OK goes on.
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await screen.findByText("Tmp-Secret-1!");
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ employeeId: ids.emp, grants: [{ zoneId: ids.ngoc, role: "ZONE_MANAGER" }, { zoneId: ids.minh, role: "ZONE_MANAGER" }, { zoneId: null, role: "ACCOUNTANT" }] });
  });
  it("never offers the reserved Employee role", async () => {
    const dialog = await open();
    expect(dialog.getAllByRole("option").map((option) => option.textContent)).not.toContain("Employee");
    expect(within(dialog.getByLabelText("Vai trò của dòng 1")).getAllByRole("option").map((option) => option.textContent)).toEqual(["Chọn vai trò", "Quản lý vùng", "Kế toán"]);
  });
  it("warns before a second Kế toán and continues only on OK", async () => {
    mocks.create.mockResolvedValue({ status: "success", data: credential });
    const dialog = await open(); fill(dialog);
    fireEvent.change(dialog.getByLabelText("Vai trò của dòng 1"), { target: { value: "ACCOUNTANT" } });
    fireEvent.submit(dialog.getByRole("button", { name: "Lưu" }).closest("form")!);
    expect(await screen.findByText(/Hợp tác xã đã có Kế toán là Phạm Kế Toán/)).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Đồng ý" }));
    await screen.findByText("Tmp-Secret-1!");
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it("asks for a zone when Quản lý vùng has none, without sending", async () => {
    const dialog = await open(); fill(dialog);
    fireEvent.change(dialog.getByLabelText("Vai trò của dòng 1"), { target: { value: "ZONE_MANAGER" } });
    fireEvent.submit(dialog.getByRole("button", { name: "Lưu" }).closest("form")!);
    expect(dialog.getByRole("alert").textContent).toMatch(/ít nhất một vùng/);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("keeps the form after a refusal and does not replay an uncertain write", async () => {
    mocks.create.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-ACCOUNT-09", uncertain: false });
    const dialog = await open(); fill(dialog);
    fireEvent.submit(dialog.getByRole("button", { name: "Lưu" }).closest("form")!);
    expect(await dialog.findByText(/đã có người dùng/)).toBeTruthy();
    expect((dialog.getByLabelText("Tên hiển thị *") as HTMLInputElement).value).toBe("Trần Bình");
    mocks.create.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: true });
    fireEvent.submit(dialog.getByRole("button", { name: "Lưu" }).closest("form")!);
    await dialog.findByText(/Chưa biết tài khoản đã được tạo chưa/);
    fireEvent.submit(dialog.getByRole("button", { name: "Lưu" }).closest("form")!);
    expect(mocks.create).toHaveBeenCalledTimes(2);
  });
});

describe("account detail", () => {
  const openDetail = async (name: string) => { render(<UserAccountsScreen />); fireEvent.click(await screen.findByRole("button", { name: `Mở tài khoản ${name}` })); return within(await screen.findByRole("dialog", { name: `Tài khoản ${name}` })); };
  it("opens on Thông tin with the linked employee as a link to the Nhân viên screen, and edits the note with the row version", async () => {
    mocks.mutate.mockResolvedValue({ status: "success", data: { ...quanLy, note: "Trực ca đêm", rowVersion: "rv-new" } });
    const dialog = await openDetail("Lê Minh Tuấn");
    expect(dialog.getByRole("link", { name: "Nguyễn Văn An" }).getAttribute("href")).toContain(`/workspace/employees?recordId=${ids.emp}`);
    fireEvent.click(dialog.getByRole("button", { name: "Sửa thông tin" }));
    fireEvent.change(dialog.getByLabelText("Ghi chú"), { target: { value: "Trực ca đêm" } });
    fireEvent.click(dialog.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledWith("update", { displayName: "Lê Minh Tuấn", username: "quanlyvung1", phoneNumber: "0900000000", email: null, note: "Trực ca đêm", rowVersion: "rv-a1" }, "a1"));
  });
  it("shows the role and zone editor on Phân quyền", async () => {
    const dialog = await openDetail("Lê Minh Tuấn");
    fireEvent.click(dialog.getByRole("tab", { name: "Phân quyền" }));
    expect(dialog.getByText("Bộ chọn vai trò và vùng")).toBeTruthy();
  });
  it("locks with a required reason, then unlocks", async () => {
    mocks.mutate.mockResolvedValueOnce({ status: "success", data: { ...quanLy, status: "Locked" } });
    const dialog = await openDetail("Lê Minh Tuấn");
    fireEvent.click(dialog.getByRole("tab", { name: "Bảo mật" }));
    fireEvent.click(dialog.getByRole("button", { name: "Khóa tài khoản" }));
    const confirm = within(screen.getByRole("dialog", { name: "Khóa tài khoản?" }));
    expect((confirm.getByRole("button", { name: "Khóa tài khoản" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(confirm.getByLabelText("Lý do khóa *"), { target: { value: "Nghỉ phép dài" } });
    fireEvent.click(confirm.getByRole("button", { name: "Khóa tài khoản" }));
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledWith("lock", { reason: "Nghỉ phép dài" }, "a1"));
    expect(await dialog.findByText(/Thay đổi gần nhất: Đã khóa. Lý do: Nghỉ phép dài/)).toBeTruthy();
  });
  it("unlocks a locked account with a reason and disallows a password reset while it is locked", async () => {
    mocks.mutate.mockResolvedValue({ status: "success", data: { ...locked, status: "Active" } });
    const dialog = await openDetail("Bị Khóa");
    fireEvent.click(dialog.getByRole("tab", { name: "Bảo mật" }));
    expect((dialog.getByRole("button", { name: "Đặt lại mật khẩu" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(dialog.getByRole("button", { name: "Mở khóa" }));
    const confirm = within(screen.getByRole("dialog", { name: "Mở khóa tài khoản?" }));
    fireEvent.change(confirm.getByLabelText("Lý do mở khóa *"), { target: { value: "Đã quay lại" } });
    fireEvent.click(confirm.getByRole("button", { name: "Mở khóa" }));
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledWith("unlock", { reason: "Đã quay lại" }, "a3"));
  });
  it("resets the password and shows the new one once", async () => {
    mocks.reset.mockResolvedValue({ status: "success", data: { account: { id: "a1", username: "quanlyvung1", displayName: "Lê Minh Tuấn" }, temporaryPassword: "Reset-Secret-2!", temporaryPasswordExpiresAt: "2026-11-27T12:00:00+07:00" } });
    const dialog = await openDetail("Lê Minh Tuấn");
    fireEvent.click(dialog.getByRole("tab", { name: "Bảo mật" }));
    fireEvent.click(dialog.getByRole("button", { name: "Đặt lại mật khẩu" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Đặt lại mật khẩu?" })).getByRole("button", { name: "Đặt lại mật khẩu" }));
    expect(await screen.findByText("Reset-Secret-2!")).toBeTruthy();
    expect(mocks.reset).toHaveBeenCalledWith("a1");
  });
  it("deletes with a required reason and the row version, then closes the detail", async () => {
    mocks.mutate.mockResolvedValue({ status: "success", data: { ...quanLy, status: "Deleted", deleted: true, employeeId: null } });
    const dialog = await openDetail("Lê Minh Tuấn");
    fireEvent.click(dialog.getByRole("tab", { name: "Bảo mật" }));
    fireEvent.click(dialog.getByRole("button", { name: "Xóa người dùng" }));
    const confirm = within(screen.getByRole("dialog", { name: "Xóa người dùng?" }));
    expect((confirm.getByRole("button", { name: "Xóa người dùng" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(confirm.getByLabelText("Lý do xóa *"), { target: { value: "Nghỉ việc" } });
    fireEvent.click(confirm.getByRole("button", { name: "Xóa người dùng" }));
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledWith("delete", { reason: "Nghỉ việc", rowVersion: "rv-a1" }, "a1"));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Tài khoản Lê Minh Tuấn" })).toBeNull());
  });
  it("offers no lock or delete for the Owner account or for yourself, and no actions on a deleted account", async () => {
    mocks.accounts = [owner, quanLy];
    const mine = await openDetail("Chủ HTX");
    fireEvent.click(mine.getByRole("tab", { name: "Bảo mật" }));
    expect(mine.queryByRole("button", { name: "Khóa tài khoản" })).toBeNull();
    expect(mine.queryByRole("button", { name: "Xóa người dùng" })).toBeNull();
    expect(mine.getByText(/đang đăng nhập nên không khóa hay xóa được/)).toBeTruthy();
    cleanup();
    mocks.accounts = [quanLy]; mocks.accountId = "someone-else"; mocks.deleted = [gone];
    render(<UserAccountsScreen />);
    fireEvent.click(await screen.findByRole("switch", { name: "Hiện cả tài khoản đã xóa" }));
    fireEvent.click(await screen.findByRole("button", { name: "Mở tài khoản Đã Xóa" }));
    const deleted = within(await screen.findByRole("dialog", { name: "Tài khoản Đã Xóa" }));
    expect(deleted.queryByRole("button", { name: "Sửa thông tin" })).toBeNull();
    fireEvent.click(deleted.getByRole("tab", { name: "Bảo mật" }));
    expect(deleted.queryByRole("button", { name: "Đặt lại mật khẩu" })).toBeNull();
    expect(deleted.queryByRole("button", { name: "Xóa người dùng" })).toBeNull();
  });
  it("opens the account named by a single valid ?accountId=", async () => {
    mocks.query = "accountId=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    render(<UserAccountsScreen />);
    expect(await screen.findByRole("dialog", { name: "Tài khoản Phạm Kế Toán" })).toBeTruthy();
  });
  it("ignores an invalid or repeated ?accountId=", async () => {
    mocks.query = "accountId=khong-hop-le";
    render(<UserAccountsScreen />);
    await screen.findByRole("button", { name: "Mở tài khoản Lê Minh Tuấn" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
