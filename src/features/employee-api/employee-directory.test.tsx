// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), query: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(repository.query) }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: async () => ({ status: "success", data: [{ id: "zone-one", code: "V01", name: "Vùng Đông", statusId: 101 }, { id: "zone-two", code: "V02", name: "Vùng Tây", statusId: 102 }] }) }));
vi.mock("./employee-detail-panel", () => ({ EmployeeDetailPanel: ({ id, initialTab }: { id: string; initialTab?: string }) => <section id={`employee-preview-${id}`} aria-label={`Chi tiết ${id}`} data-tab={initialTab}>Chi tiết đã mở</section> }));
import { employeeDetailFixture } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";
import { EmployeeDirectory } from "./employee-directory";
import { EmployeeDirectoryTable } from "./employee-directory-table";
const first = () => employeeViewSchema.parse(employeeDetailFixture());
const second = () => ({ ...first(), id: "88434e3f-e984-4aae-b6a9-e77af4822288", fullName: "Trần Bình" });
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); repository.query = "";
  repository.read.mockImplementation(async (action, query) => action === "job-types" ? { status: "success", data: [] } : { status: "success", data: { items: [first(), second()], page: Number(query.page), pageSize: Number(query.pageSize), total: 45 } });
});
afterEach(cleanup);
it("resolves a linked employee absent from the scoped list through its detail panel without changing paging totals", async () => {
  const linked = "aa7e5561-7bca-4572-afac-c7fda318f4a2";
  repository.query = `recordId=${linked}`;
  render(<EmployeeDirectory readOnly access={{ manage: false, payroll: false }} />);
  expect(await screen.findByRole("region", { name: `Chi tiết ${linked}` })).toBeTruthy();
  expect(screen.getByText(/45 nhân viên/)).toBeTruthy();
  expect(screen.queryByText("Không có nhân viên phù hợp bộ lọc.")).toBeNull();
});
it("opens a linked employee on the login tab when the link says ?tab=account, and only for the Owner", async () => {
  repository.query = `recordId=${first().id}&tab=account`;
  const view = render(<EmployeeDirectory />);
  expect((await screen.findByRole("region", { name: `Chi tiết ${first().id}` })).getAttribute("data-tab")).toBe("account");
  view.unmount();
  render(<EmployeeDirectory readOnly access={{ manage: false, payroll: false }} />);
  expect((await screen.findByRole("region", { name: `Chi tiết ${first().id}` })).hasAttribute("data-tab")).toBe(false);
});
it("closed rows expose only native chevrons, click and keyboard toggle one open row without making the row a tab stop", async () => {
  const user = userEvent.setup();
  render(<EmployeeDirectoryTable items={[first(), second()]} disabled={false} cache={new Map()} onSaved={vi.fn()} />);
  const row = screen.getByText(first().fullName).closest("tr")!;
  expect(row.getAttribute("tabindex")).toBeNull();
  // The native chevron plus the login-name chip that opens the account tab.
  expect(within(row).getAllByRole("button").map(button => button.getAttribute("aria-label")?.replace(/ .*/, ""))).toEqual(["Mở", "Mở", "Mở"]);
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
it("shows the login name beside the employee and opens that row on the account tab from it, without toggling twice", () => {
  const { rerender } = render(<EmployeeDirectoryTable items={[first(), { ...second(), account: null }]} disabled={false} cache={new Map()} onSaved={vi.fn()} />);
  // Two entry points for the same account: the chip beside the name (CSS-hidden while the "Tên đăng nhập" column shows, back when the pane is open) and the column link.
  const [chip, columnLink] = screen.getAllByRole("button", { name: /@fixture\.an/ });
  expect(chip.textContent).toBe("@fixture.an"); expect(columnLink.textContent).toBe("@fixture.an");
  expect(document.querySelector("table")!.hasAttribute("data-username-column")).toBe(true);
  expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  fireEvent.click(chip);
  expect(screen.getByRole("region", { name: `Chi tiết ${first().id}` }).getAttribute("data-tab")).toBe("account");
  // Clicking the chip of the row that is already open keeps it open (remounted on the account tab) instead of closing it.
  fireEvent.click(columnLink);
  expect(screen.getByRole("region", { name: `Chi tiết ${first().id}` }).getAttribute("data-tab")).toBe("account");
  // A plain row toggle opens on the default tab again.
  fireEvent.click(screen.getByRole("button", { name: `Thu gọn ${first().fullName}` }));
  fireEvent.click(screen.getByRole("button", { name: `Mở ${first().fullName}` }));
  expect(screen.getByRole("region", { name: `Chi tiết ${first().id}` }).hasAttribute("data-tab")).toBe(false);
  // Read-only viewers get the same name, but not a button to a tab they cannot open.
  rerender(<EmployeeDirectoryTable items={[first()]} disabled={false} cache={new Map()} onSaved={vi.fn()} access={{ manage: false, payroll: false }} />);
  expect(screen.queryByRole("button", { name: /@fixture\.an/ })).toBeNull();
  expect(screen.getAllByText("@fixture.an").length).toBe(2);
});
it("ignores a column choice saved by the old version: everyone starts from the new default, and no old Tài khoản column exists", async () => {
  localStorage.setItem("omts-columns-employees", "code,account,debt");
  render(<EmployeeDirectory />); await screen.findByText(first().fullName);
  const headers = screen.getAllByRole("columnheader").map(cell => cell.textContent);
  expect(headers).toEqual(["", "Mở dòng", "Họ và tên", "Tên đăng nhập", "Số điện thoại", "Loại nhân viên", "Vùng làm việc", "Giờ công", "Nợ lương", "Tình trạng"]);
  expect(headers).not.toContain("Mã nhân viên"); expect(headers).not.toContain("Tài khoản");
  expect(screen.queryByRole("checkbox", { name: "Tài khoản" })).toBeNull();
  // The code is still one click away in the picker, and a later choice is kept as chosen (never re-added).
  fireEvent.click(screen.getByRole("button", { name: "Chọn trường hiển thị" }));
  expect((screen.getByRole("checkbox", { name: "Mã nhân viên" }) as HTMLInputElement).checked).toBe(false);
  fireEvent.click(screen.getByRole("checkbox", { name: "Mã nhân viên" }));
  expect(screen.getByRole("columnheader", { name: "Mã nhân viên" })).toBeTruthy();
});
it("offers only real columns and remembers browser column choices across mounts", async () => {
  const view = render(<EmployeeDirectory />);
  await screen.findByText(first().fullName);
  expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(["", "Mở dòng", "Họ và tên", "Tên đăng nhập", "Số điện thoại", "Loại nhân viên", "Vùng làm việc", "Giờ công", "Nợ lương", "Tình trạng"]);
  // Sortable headers are real buttons; the job-type column has no server sort.
  expect(screen.getByRole("button", { name: "Họ và tên" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Chọn trường hiển thị" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Loại công việc" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Số điện thoại" }));
  expect(screen.getByRole("columnheader", { name: "Loại công việc" })).toBeTruthy();
  expect(screen.queryByRole("columnheader", { name: "Số điện thoại" })).toBeNull();
  expect(localStorage.getItem("omts-columns-employees-v4")).toContain("jobs");
  view.unmount(); render(<EmployeeDirectory />); await screen.findByText(first().fullName);
  expect(screen.getByRole("columnheader", { name: "Loại công việc" })).toBeTruthy();
  expect(screen.queryByRole("columnheader", { name: "Số điện thoại" })).toBeNull();
});
it.each(["code,debt", "code", "debt", "garbage,,", ""])("a stale column choice %j still lists the name as the first data column, with no width of its own", async stored => {
  // The management kit keeps only the first data column (and the last) beside an open detail pane, so the name must come first.
  localStorage.setItem("omts-columns-employees-v4", stored);
  const { container } = render(<EmployeeDirectory />); await screen.findByText(first().fullName);
  const headers = screen.getAllByRole("columnheader").map(cell => cell.textContent);
  expect(headers.slice(0, 3)).toEqual(["", "Mở dòng", "Họ và tên"]);
  // The last column (the other one the kit keeps beside an open pane) is the status, never a pay figure.
  expect(headers.at(-1)).toBe("Tình trạng");
  // Checkbox, chevron, then the name col: the name takes the remaining width.
  const cols = container.querySelectorAll("col");
  expect((cols[2] as HTMLElement).style.width).toBe("");
});
it("status pills, zone, reset, server paging and debounced search drive the actual query", async () => {
  render(<EmployeeDirectory />); await screen.findByText(first().fullName);
  const latestQuery = () => repository.read.mock.calls.filter(call => call[0] === "list").at(-1)?.[1];
  expect(latestQuery()).toMatchObject({ statusId: "401", page: "1", pageSize: "10" });
  // Only In Use zones are offered, with no status suffix: a discontinued zone belongs to the Vùng nuôi screen alone.
  expect(screen.getByRole("option", { name: "V01 · Vùng Đông" })).toBeTruthy();
  expect(screen.queryByRole("option", { name: /Vùng Tây/ })).toBeNull();
  fireEvent.click(screen.getByRole("radio", { name: "Đã nghỉ việc" }));
  await waitFor(() => expect(latestQuery()).toMatchObject({ statusId: "402", page: "1" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Vùng làm việc" }), { target: { value: "zone-one" } });
  await waitFor(() => expect(latestQuery()).toMatchObject({ statusId: "402", zoneId: "zone-one", page: "1" }));
  await waitFor(() => expect((screen.getByRole("button", { name: "Trang sau" }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
  await waitFor(() => expect(latestQuery()).toMatchObject({ page: "2", pageSize: "10" }));
  expect(screen.getAllByRole("option").filter(option => /dòng$/.test(option.textContent ?? "")).map(option => option.textContent)).toEqual(["10 dòng", "30 dòng", "50 dòng"]);
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
