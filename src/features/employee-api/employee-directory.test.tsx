// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), query: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(repository.query) }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify: vi.fn() }) }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: async () => ({ status: "success", data: [{ id: "zone-one", code: "V01", name: "Vùng Đông", statusId: 101 }, { id: "zone-two", code: "V02", name: "Vùng Tây", statusId: 102 }, { id: "zone-three", code: "V03", name: "Vùng Nam", statusId: 101 }, { id: "zone-four", code: "V04", name: "Vùng Bắc", statusId: 101 }] }) }));
vi.mock("./employee-detail-panel", () => ({ EmployeeDetailPanel: ({ id, initialTab }: { id: string; initialTab?: string }) => <section id={`employee-preview-${id}`} aria-label={`Chi tiết ${id}`} data-tab={initialTab}>Chi tiết đã mở</section> }));
import { employeeDetailFixture } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";
import { EmployeeDirectory } from "./employee-directory";
import { EmployeeDirectoryTable } from "./employee-directory-table";
import type { EmployeeViewerAccess } from "./employee-viewer-access";
import { HeaderZones, chooseHeaderZones } from "@/test/header-zones";

const owner: EmployeeViewerAccess = { read: true, manage: true, payroll: true, salary: true, salaryEdit: true };
const viewer: EmployeeViewerAccess = { read: true, manage: false, payroll: false, salary: false, salaryEdit: false };
const first = () => ({ ...employeeViewSchema.parse(employeeDetailFixture()), salaryType: "FixedMonthly" as const });
const second = () => ({ ...first(), id: "88434e3f-e984-4aae-b6a9-e77af4822288", code: "NV000002", fullName: "Trần Bình", salaryType: null });
const noop = { onEdit: vi.fn(), onChanged: vi.fn(), onEditSalary: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks(); chooseHeaderZones([]); repository.query = "";
  repository.read.mockImplementation(async (_action, query) => ({ status: "success", data: { items: [first(), second()], page: Number(query.page), pageSize: Number(query.pageSize), total: 45 } }));
});
afterEach(cleanup);

it("resolves a linked employee absent from the scoped list through its detail panel without changing paging totals", async () => {
  const linked = "aa7e5561-7bca-4572-afac-c7fda318f4a2";
  repository.query = `recordId=${linked}`;
  render(<EmployeeDirectory readOnly access={viewer} />);
  expect(await screen.findByRole("region", { name: `Chi tiết ${linked}` })).toBeTruthy();
  expect(screen.getByText(/45 nhân viên/)).toBeTruthy();
});
it("lists the KiotViet columns with the type and salary type as plain text, no check icon and no Thời vụ pill beside the name", async () => {
  render(<EmployeeDirectory access={owner} />); await screen.findByText(first().fullName);
  expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(["", "Mở dòng", "Ảnh", "Mã nhân viên", "Tên nhân viên", "Số điện thoại", "Số CMND/CCCD", "Loại", "Vùng làm việc", "Loại lương", "Nợ và tạm ứng", "Ghi chú", "Tình trạng"]);
  const row = screen.getByText(second().fullName).closest("tr")!;
  expect(within(row).getByText("Chưa thiết lập")).toBeTruthy();
  expect(within(row).getByText("Nội bộ")).toBeTruthy();
  expect(row.querySelector("[data-employee-type]")).toBeNull();
  expect(within(screen.getByText(first().fullName).closest("tr")!).getByText("Cố định tháng")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Danh sách nhân viên" })).toBeTruthy();
  expect(screen.getByRole("searchbox", { name: "Tìm nhân viên" }).getAttribute("placeholder")).toBe("Tìm theo mã, tên nhân viên");
});
it("hides the pay columns from a viewer without payroll access, and leaves out a personal column the rows do not carry", async () => {
  render(<EmployeeDirectory readOnly access={viewer} />); await screen.findByText(first().fullName);
  const headers = screen.getAllByRole("columnheader").map(cell => cell.textContent);
  expect(headers).not.toContain("Loại lương"); expect(headers).not.toContain("Nợ và tạm ứng");
  cleanup();
  // A list answer without the personal keys (an older backend) leaves those columns out instead of a wall of dashes.
  const bare: Partial<ReturnType<typeof first>> = first();
  delete bare.idNumber; delete bare.notes;
  repository.read.mockImplementation(async (_action, query) => ({ status: "success", data: { items: [bare], page: Number(query.page), pageSize: Number(query.pageSize), total: 1 } }));
  render(<EmployeeDirectory access={owner} />); await screen.findByText(first().fullName);
  expect(screen.queryByRole("columnheader", { name: "Số CMND/CCCD" })).toBeNull(); expect(screen.queryByRole("columnheader", { name: "Ghi chú" })).toBeNull();
});
it("closed rows expose only the native chevron; click and keyboard toggle one open row", async () => {
  const user = userEvent.setup();
  render(<EmployeeDirectoryTable items={[first(), second()]} disabled={false} cache={new Map()} access={owner} {...noop} />);
  const row = screen.getByText(first().fullName).closest("tr")!;
  expect(row.getAttribute("tabindex")).toBeNull();
  expect(within(row).getAllByRole("button")).toHaveLength(1);
  fireEvent.click(screen.getByText(first().fullName));
  expect(screen.getAllByRole("region")).toHaveLength(1);
  const nextToggle = screen.getByRole("button", { name: `Mở ${second().fullName}` });
  nextToggle.focus(); await user.keyboard("{Enter}");
  expect(screen.queryByRole("region", { name: `Chi tiết ${first().id}` })).toBeNull();
  expect(screen.getByRole("region", { name: `Chi tiết ${second().id}` })).toBeTruthy();
});
it("remembers browser column choices across mounts", async () => {
  const view = render(<EmployeeDirectory access={owner} />);
  await screen.findByText(first().fullName);
  fireEvent.click(screen.getByRole("button", { name: "Chọn trường hiển thị" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Số điện thoại" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Tài khoản đăng nhập" }));
  expect(screen.queryByRole("columnheader", { name: "Số điện thoại" })).toBeNull();
  expect(screen.getByRole("columnheader", { name: "Tài khoản đăng nhập" })).toBeTruthy();
  view.unmount(); render(<EmployeeDirectory access={owner} />); await screen.findByText(first().fullName);
  expect(screen.queryByRole("columnheader", { name: "Số điện thoại" })).toBeNull();
  expect(screen.getByRole("columnheader", { name: "Tài khoản đăng nhập" })).toBeTruthy();
});
it("status, type and zone filters, reset, server paging and debounced search drive the actual query", async () => {
  render(<HeaderZones><EmployeeDirectory access={owner} /></HeaderZones>); await screen.findByText(first().fullName);
  const latestQuery = () => repository.read.mock.calls.filter(call => call[0] === "list").at(-1)?.[1];
  expect(latestQuery()).toMatchObject({ statusId: "401", page: "1", pageSize: "10" });
  // Only In Use zones are offered, with no status suffix: a discontinued zone belongs to the Vùng nuôi screen alone.
  expect(await screen.findByRole("option", { name: "V01 · Vùng Đông" })).toBeTruthy();
  expect(screen.queryByRole("option", { name: /Vùng Tây/ })).toBeNull();
  expect(screen.queryByRole("combobox", { name: "Loại công việc" })).toBeNull();
  fireEvent.click(screen.getByRole("radio", { name: "Đã nghỉ" }));
  await waitFor(() => expect(latestQuery()).toMatchObject({ statusId: "402", page: "1" }));
  fireEvent.click(screen.getByRole("radio", { name: "Thời vụ" }));
  await waitFor(() => expect(latestQuery()).toMatchObject({ employeeType: "SeasonalWorker" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Vùng làm việc" }), { target: { value: "zone-one" } });
  await waitFor(() => expect(latestQuery()).toMatchObject({ statusId: "402", zoneIds: "zone-one", page: "1" }));
  await waitFor(() => expect((screen.getByRole("button", { name: "Trang sau" }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
  await waitFor(() => expect(latestQuery()).toMatchObject({ page: "2", pageSize: "10" }));
  fireEvent.change(screen.getByRole("searchbox", { name: "Tìm nhân viên" }), { target: { value: " Nguyễn " } });
  expect(latestQuery().search).toBe("");
  await waitFor(() => expect(latestQuery()).toMatchObject({ search: "Nguyễn", page: "1" }));
  fireEvent.click(screen.getByRole("button", { name: "Đặt lại" }));
  await waitFor(() => expect(latestQuery()).toMatchObject({ search: "", statusId: "401", employeeType: "", page: "1" }));
});
it("follows the header zones: a subset is sent as one zoneIds list and the rail narrows the header", async () => {
  chooseHeaderZones(["zone-one", "zone-three"]);
  render(<HeaderZones><EmployeeDirectory access={owner} /></HeaderZones>);
  const latestQuery = () => repository.read.mock.calls.filter(call => call[0] === "list").at(-1)?.[1];
  await waitFor(() => expect(latestQuery()).toMatchObject({ zoneIds: "zone-one,zone-three", page: "1" }));
  const select = await screen.findByRole("combobox", { name: "Vùng làm việc" }) as HTMLSelectElement;
  expect(select.selectedOptions[0].textContent).toBe("2 vùng đã chọn");
  fireEvent.change(select, { target: { value: "" } });
  await waitFor(() => expect(latestQuery().zoneIds).toBe(""));
  expect(JSON.parse(localStorage.getItem("omts.selected-zones.v1.header-zones-test")!)).toEqual({ kind: "all" });
});
