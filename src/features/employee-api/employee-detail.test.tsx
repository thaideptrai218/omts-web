// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
import { employeeDetailFixture } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";
import { EmployeeDirectoryTable } from "./employee-directory-table";
const fixture = () => employeeViewSchema.parse(employeeDetailFixture());
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
function setup(record = fixture()) {
  repository.read.mockResolvedValue({ status: "success", data: record });
  const cache = new Map();
  render(<EmployeeDirectoryTable items={[record]} disabled={false} onOpen={vi.fn()} onSaved={vi.fn()} cache={cache} />);
  return screen.getByRole("button", { name: `Xem ${record.fullName}` });
}
it("toggles a row with Enter and Space using its native accessible button", async () => {
  const user = userEvent.setup(), toggle = setup();
  toggle.focus();
  await user.keyboard("{Enter}");
  await screen.findByRole("tab", { name: "Thông tin" });
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  toggle.focus(); await user.keyboard(" ");
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(screen.queryByRole("tablist")).toBeNull();
});
it("loads detail lazily, exposes linked ARIA tabs, keyboard navigation and caches a collapsed row", async () => {
  const toggle = setup();
  expect(repository.read).not.toHaveBeenCalled();
  fireEvent.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  await screen.findByRole("tab", { name: "Thông tin" });
  expect(repository.read).toHaveBeenCalledTimes(1);
  const information = screen.getByRole("tab", { name: "Thông tin" });
  expect(document.getElementById(information.getAttribute("aria-controls")!)?.getAttribute("aria-labelledby")).toBe(information.id);
  information.focus(); fireEvent.keyDown(information, { key: "ArrowRight" });
  const work = screen.getByRole("tab", { name: "Công việc" });
  expect(work.getAttribute("aria-selected")).toBe("true"); expect(document.activeElement).toBe(work);
  expect(within(screen.getByRole("tabpanel")).getByText("Lịch sử loại nhân viên")).toBeTruthy();
  fireEvent.keyDown(work, { key: "End" });
  expect(screen.getByRole("tab", { name: "Tài khoản đăng nhập" }).getAttribute("aria-selected")).toBe("true");
  fireEvent.click(toggle); fireEvent.click(toggle);
  await screen.findByRole("tab", { name: "Thông tin" });
  expect(repository.read).toHaveBeenCalledTimes(1);
});
it("shows denial instead of absent personal and bank fields", async () => {
  fireEvent.click(setup({ ...fixture(), canMaintain: false, birthday: undefined, address: undefined, bankAccount: undefined }));
  await screen.findByRole("tab", { name: "Thông tin" });
  expect(within(screen.getByRole("tabpanel")).getByRole("alert").textContent).toContain("không có quyền");
  fireEvent.click(screen.getByRole("tab", { name: "Ngân hàng" }));
  expect(within(screen.getByRole("tabpanel")).getByRole("alert").textContent).toContain("không có quyền");
  expect(screen.queryByText("Chưa có thông tin ngân hàng")).toBeNull();
  expect((screen.getByRole("button", { name: "Cập nhật hồ sơ" }) as HTMLButtonElement).disabled).toBe(true);
});
it("shows initial loading and retries a failed detail read", async () => {
  const toggle = setup();
  let finish!: (value: unknown) => void;
  repository.read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  fireEvent.click(toggle);
  await screen.findByRole("status", { name: "Đang tải dữ liệu" });
  finish({ status: "error", httpStatus: 403, uncertain: false });
  fireEvent.click(await screen.findByRole("button", { name: "Thử lại tải hồ sơ" }));
  await screen.findByRole("tab", { name: "Thông tin" });
  await waitFor(() => expect(repository.read).toHaveBeenCalledTimes(2));
});
it("refreshes the open account tab after a save without caching credentials or resetting the tab", async () => {
  const record = fixture(), cache = new Map();
  repository.read.mockResolvedValue({ status: "success", data: record });
  const props = { items: [record], disabled: false, onOpen: vi.fn(), onSaved: vi.fn(), cache };
  const view = render(<EmployeeDirectoryTable {...props} detailRevision={0} />);
  fireEvent.click(screen.getByRole("button", { name: `Xem ${record.fullName}` }));
  fireEvent.click(await screen.findByRole("tab", { name: "Tài khoản đăng nhập" }));
  cache.clear();
  repository.read.mockResolvedValue({ status: "success", data: { ...record, account: { ...record.account!, username: "updated.staff" } } });
  view.rerender(<EmployeeDirectoryTable {...props} detailRevision={1} />);
  await screen.findByText("@updated.staff");
  expect(screen.getByRole("tab", { name: "Tài khoản đăng nhập" }).getAttribute("aria-selected")).toBe("true");
  expect(repository.read).toHaveBeenCalledTimes(2);
  expect(cache.get(record.id)).not.toHaveProperty("temporaryPassword");
});
