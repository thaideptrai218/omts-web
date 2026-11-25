// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), query: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(repository.query) }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
const zone = "11111111-1111-4111-8111-111111111111";
const lookups = vi.hoisted(() => ({ accounts: [] as Record<string, unknown>[] }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: async (resource: string) => ({ status: "success", data: resource === "accounts" ? lookups.accounts : resource === "zones" ? [{ id: "11111111-1111-4111-8111-111111111111", code: "V1", name: "Vùng Đông", statusId: 101 }] : [] }) }));
vi.mock("./employee-detail-panel", () => ({ EmployeeDetailPanel: () => null }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
vi.mock("@/features/account-access/account-access-panel", () => ({ AccountAccessPanel: ({ account }: { account: { username: string } }) => <p>Phân vai cho {account.username}</p> }));
import { employeeDetailFixture } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";
import { EmployeeDirectory } from "./employee-directory";

const withLogin = () => employeeViewSchema.parse(employeeDetailFixture());
const withoutLogin = () => ({ ...withLogin(), id: "88434e3f-e984-4aae-b6a9-e77af4822288", fullName: "Trần Bình", account: null });
const pair = (role: string, zoneId: string | null) => ({ id: `${role}-${zoneId}`, zoneId, zoneName: zoneId ? "Vùng Đông" : null, allZones: !zoneId, role, roleName: role });
const login = (id: string, username: string, extra: Record<string, unknown> = {}) => ({ id, username, displayName: username, phoneNumber: "0900000001", email: null, status: "Active", employeeId: null, rowVersion: "v", pairs: [], ...extra });
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); repository.query = "";
  lookups.accounts = [login(withLogin().account!.id, "fixture.an", { employeeId: withLogin().id, pairs: [pair("ZONE_MANAGER", zone)] }), login("99999999-9999-4999-8999-999999999999", "qa.audit", { displayName: "QA audit", pairs: [pair("ACCOUNTANT", null)] })];
  repository.read.mockImplementation(async (action, query) => action === "job-types" ? { status: "success", data: [] } : { status: "success", data: { items: [withLogin(), withoutLogin()], page: Number(query.page), pageSize: Number(query.pageSize), total: 2 } });
});
afterEach(cleanup);

it("shows the role and zones of each login in the list, and nothing for an employee without one", async () => {
  render(<EmployeeDirectory />);
  await screen.findByText(withLogin().fullName);
  const table = within(screen.getByRole("table"));
  await waitFor(() => expect(table.getByText("Quản lý vùng")).toBeTruthy());
  expect(table.getByText("Vùng Đông")).toBeTruthy();
});

it("lists only employees without a login when 'Chưa có tài khoản' is chosen", async () => {
  render(<EmployeeDirectory />);
  await screen.findByText(withLogin().fullName);
  fireEvent.click(screen.getByLabelText("Chưa có tài khoản"));
  await waitFor(() => expect(screen.queryByText(withLogin().fullName)).toBeNull());
  expect(screen.getByText("Trần Bình")).toBeTruthy();
});

it("filters by the role of the login", async () => {
  render(<EmployeeDirectory />);
  await screen.findByText(withLogin().fullName);
  fireEvent.click(screen.getByLabelText("Kế toán"));
  await screen.findByText("Không có nhân viên phù hợp bộ lọc.");
  fireEvent.click(screen.getByLabelText("Quản lý vùng"));
  expect(await screen.findByText(withLogin().fullName)).toBeTruthy();
  expect(screen.queryByText("Trần Bình")).toBeNull();
});

it("lists the logins that no employee holds, with the same way in to manage them", async () => {
  render(<EmployeeDirectory />);
  await screen.findByText(withLogin().fullName);
  fireEvent.click(screen.getByLabelText("Tài khoản chưa gắn nhân viên"));
  expect(await screen.findByRole("button", { name: "Mở tài khoản QA audit" })).toBeTruthy();
  expect(screen.queryByText(withLogin().fullName)).toBeNull();
  expect(screen.getByText("1 tài khoản chưa gắn nhân viên")).toBeTruthy();
  // The employee filters make no sense for them and are gone.
  expect(screen.queryByText("Loại nhân viên")).toBeNull();
});

it("gives a viewer who is not the Owner no login filters and no role column", async () => {
  render(<EmployeeDirectory readOnly access={{ manage: false, payroll: false }} />);
  await screen.findByText(withLogin().fullName);
  expect(screen.queryByLabelText("Chưa có tài khoản")).toBeNull();
  expect(screen.queryByRole("columnheader", { name: "Vai trò và vùng" })).toBeNull();
});

it("opens the unlinked list straight from ?account=unlinked&openAccount=<id>", async () => {
  repository.query = "account=unlinked&openAccount=99999999-9999-4999-8999-999999999999";
  render(<EmployeeDirectory />);
  expect(await screen.findByRole("button", { name: "Mở tài khoản QA audit" })).toBeTruthy();
  expect(await screen.findByRole("dialog", { name: "Tài khoản QA audit" })).toBeTruthy();
  expect(screen.getByText("Phân vai cho qa.audit")).toBeTruthy();
});
