// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), query: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(repository.query) }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify: vi.fn() }) }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
const loadOptions = vi.hoisted(() => vi.fn());
vi.mock("@/features/operations/lookups", () => ({ loadOptions }));
vi.mock("./employee-detail-panel", () => ({ EmployeeDetailPanel: () => null }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { employeeDetailFixture } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";
import { EmployeeDirectory } from "./employee-directory";

const withLogin = () => employeeViewSchema.parse(employeeDetailFixture());
const withoutLogin = () => ({ ...withLogin(), id: "88434e3f-e984-4aae-b6a9-e77af4822288", fullName: "Trần Bình", account: null });
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); repository.query = "";
  loadOptions.mockImplementation(async (resource: string) => ({ status: "success", data: resource === "zones" ? [{ id: "11111111-1111-4111-8111-111111111111", code: "V1", name: "Vùng Đông", statusId: 101 }] : [] }));
  repository.read.mockImplementation(async (action, query) => action === "job-types" ? { status: "success", data: [] } : { status: "success", data: { items: [withLogin(), withoutLogin()], page: Number(query.page), pageSize: Number(query.pageSize), total: 2 } });
});
afterEach(cleanup);

it("shows the username of each login and no role column: roles are managed on the Tài khoản người dùng screen", async () => {
  render(<EmployeeDirectory />);
  await screen.findByText(withLogin().fullName);
  fireEvent.click(screen.getByRole("button", { name: "Chọn trường hiển thị" })); fireEvent.click(screen.getByRole("checkbox", { name: "Tài khoản đăng nhập" }));
  expect(within(screen.getByRole("table")).getByText("@fixture.an")).toBeTruthy();
  expect(screen.queryByRole("columnheader", { name: "Vai trò và vùng" })).toBeNull();
  expect(loadOptions).not.toHaveBeenCalledWith("accounts", expect.anything());
});

it("lists only employees without a login when 'Chưa có tài khoản' is chosen, and the other way round", async () => {
  render(<EmployeeDirectory />);
  await screen.findByText(withLogin().fullName);
  fireEvent.click(screen.getByLabelText("Chưa có tài khoản"));
  await screen.findByText("Trần Bình");
  expect(screen.queryByText(withLogin().fullName)).toBeNull();
  fireEvent.click(screen.getByLabelText("Có tài khoản"));
  expect(await screen.findByText(withLogin().fullName)).toBeTruthy();
  expect(screen.queryByText("Trần Bình")).toBeNull();
});

it("offers no role, zone or unlinked-account filters any more", async () => {
  render(<EmployeeDirectory />);
  await screen.findByText(withLogin().fullName);
  expect(screen.queryByLabelText("Kế toán")).toBeNull();
  expect(screen.queryByLabelText("Vùng phụ trách")).toBeNull();
  expect(screen.queryByLabelText("Tài khoản chưa gắn nhân viên")).toBeNull();
});

it("gives a viewer who is not the Owner no account filter", async () => {
  render(<EmployeeDirectory readOnly access={{ read: true, manage: false, payroll: false, salary: false, salaryEdit: false }} />);
  await screen.findByText(withLogin().fullName);
  expect(screen.queryByLabelText("Chưa có tài khoản")).toBeNull();
});

it("starts on the simple filter from ?account=none", async () => {
  repository.query = "account=none";
  render(<EmployeeDirectory />);
  expect(await screen.findByText("Trần Bình")).toBeTruthy();
  expect(screen.queryByText(withLogin().fullName)).toBeNull();
});
