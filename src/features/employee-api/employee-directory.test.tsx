// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: async () => ({ status: "success", data: [{ id: "zone-one", code: "V01", name: "Vùng Đông", statusId: 102 }] }) }));
vi.mock("./employee-detail-panel", () => ({ EmployeeDetailPanel: ({ id }: { id: string }) => <section id={`employee-preview-${id}`} aria-label={`Chi tiết ${id}`}>Chi tiết đã mở</section> }));
import { employeeDetailFixture } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";
import { EmployeeDirectory } from "./employee-directory";
import { EmployeeDirectoryTable } from "./employee-directory-table";
const first = () => employeeViewSchema.parse(employeeDetailFixture());
const second = () => ({ ...first(), id: "88434e3f-e984-4aae-b6a9-e77af4822288", fullName: "Trần Bình" });
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  repository.read.mockImplementation(async (action, query) => action === "job-types" ? { status: "success", data: [] } : { status: "success", data: { items: [first(), second()], page: Number(query.page), pageSize: Number(query.pageSize), total: 45 } });
});
afterEach(cleanup);
it("closed rows expose only native chevrons, click and keyboard toggle one open row without making the row a tab stop", async () => {
  const user = userEvent.setup();
  render(<EmployeeDirectoryTable items={[first(), second()]} disabled={false} cache={new Map()} onSaved={vi.fn()} />);
  const row = screen.getByText(first().fullName).closest("tr")!;
  expect(row.getAttribute("tabindex")).toBeNull();
  expect(within(row).getAllByRole("button")).toHaveLength(1);
  expect(screen.queryByRole("button", { name: /Xem hồ sơ/ })).toBeNull();
  fireEvent.click(screen.getByText(first().fullName));
  expect(screen.getAllByRole("region")).toHaveLength(1);
  const firstToggle = screen.getByRole("button", { name: `Thu gọn ${first().fullName}` });
  expect(firstToggle.getAttribute("aria-controls")).toBe(`employee-preview-${first().id}`);
  const nextToggle = screen.getByRole("button", { name: `Mở ${second().fullName}` });
  nextToggle.focus(); await user.keyboard("{Enter}");
  expect(screen.queryByRole("region", { name: `Chi tiết ${first().id}` })).toBeNull();
  expect(screen.getByRole("region", { name: `Chi tiết ${second().id}` })).toBeTruthy();
  expect(firstToggle.getAttribute("aria-expanded")).toBe("false");
  nextToggle.focus(); await user.keyboard(" ");
  expect(screen.queryByRole("region")).toBeNull();
});
it("offers only real columns and remembers browser column choices across mounts", async () => {
  const view = render(<EmployeeDirectory />);
  await screen.findByText(first().fullName);
  expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(["", "Mở dòng", "Mã nhân viên", "Họ và tên", "Số điện thoại", "Loại nhân viên", "Vùng làm việc", "Tình trạng"]);
  // Sortable headers are real buttons; the job-type column has no server sort.
  expect(screen.getByRole("button", { name: "Họ và tên" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Chọn trường hiển thị" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Loại công việc" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Số điện thoại" }));
  expect(screen.getByRole("columnheader", { name: "Loại công việc" })).toBeTruthy();
  expect(screen.queryByRole("columnheader", { name: "Số điện thoại" })).toBeNull();
  expect(localStorage.getItem("omts-columns-employees")).toContain("jobs");
  view.unmount(); render(<EmployeeDirectory />); await screen.findByText(first().fullName);
  expect(screen.getByRole("columnheader", { name: "Loại công việc" })).toBeTruthy();
  expect(screen.queryByRole("columnheader", { name: "Số điện thoại" })).toBeNull();
});
it("status pills, zone, reset, server paging and debounced search drive the actual query", async () => {
  render(<EmployeeDirectory />); await screen.findByText(first().fullName);
  const latestQuery = () => repository.read.mock.calls.filter(call => call[0] === "list").at(-1)?.[1];
  expect(latestQuery()).toMatchObject({ statusId: "401", page: "1", pageSize: "15" });
  expect(screen.getByRole("option", { name: "V01 · Vùng Đông (đã ngừng)" })).toBeTruthy();
  fireEvent.click(screen.getByRole("radio", { name: "Đã nghỉ việc" }));
  await waitFor(() => expect(latestQuery()).toMatchObject({ statusId: "402", page: "1" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Vùng làm việc" }), { target: { value: "zone-one" } });
  await waitFor(() => expect(latestQuery()).toMatchObject({ statusId: "402", zoneId: "zone-one", page: "1" }));
  await waitFor(() => expect((screen.getByRole("button", { name: "Trang sau" }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
  await waitFor(() => expect(latestQuery()).toMatchObject({ page: "2", pageSize: "15" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Hiển thị" }), { target: { value: "30" } });
  await waitFor(() => expect(latestQuery()).toMatchObject({ page: "1", pageSize: "30" }));
  fireEvent.change(screen.getByRole("searchbox", { name: "Tìm nhân viên" }), { target: { value: " Nguyễn " } });
  expect(latestQuery().search).toBe("");
  await waitFor(() => expect(latestQuery()).toMatchObject({ search: "Nguyễn", page: "1" }));
  fireEvent.click(screen.getByRole("button", { name: "Đặt lại" }));
  await waitFor(() => expect(latestQuery()).toMatchObject({ search: "", zoneId: "", statusId: "401", page: "1" }));
  // Two pill groups now offer "Tất cả": employee type first, status second.
  fireEvent.click(screen.getAllByRole("radio", { name: /^Tất cả$/ })[1]);
  await waitFor(() => expect(latestQuery()).not.toHaveProperty("statusId"));
});
