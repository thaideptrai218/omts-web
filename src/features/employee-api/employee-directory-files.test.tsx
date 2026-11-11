// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
const files = vi.hoisted(() => ({ exportFile: vi.fn(), template: vi.fn(), importFile: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: async () => ({ status: "success", data: [{ id: "zone-one", code: "V01", name: "Vùng Đông", statusId: 101 }] }) }));
vi.mock("./employee-file-repository", () => ({ employeeFileRepository: files }));
vi.mock("./employee-detail-panel", () => ({ EmployeeDetailPanel: ({ id }: { id: string }) => <section aria-label={`Chi tiết ${id}`}>Chi tiết đã mở</section> }));
import { employeeDetailFixture } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";
import { EmployeeDirectory } from "./employee-directory";

const first = () => employeeViewSchema.parse(employeeDetailFixture());
const second = () => ({ ...first(), id: "88434e3f-e984-4aae-b6a9-e77af4822288", code: "NV000002", fullName: "Trần Bình" });
const jobId = "9429f1c0-b70f-42d6-9a9f-1c6a1e608c22";
const latestQuery = () => repository.read.mock.calls.filter(call => call[0] === "list").at(-1)?.[1];
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.clearAllMocks(); localStorage.clear();
  files.exportFile.mockResolvedValue({ status: "success", data: true }); files.template.mockResolvedValue({ status: "success", data: true });
  repository.read.mockImplementation(async (action, query) => action === "job-types" ? { status: "success", data: [{ id: jobId, name: "Thu hoạch" }] } : { status: "success", data: { items: [first(), second()], page: Number(query.page), pageSize: Number(query.pageSize), total: 45 } });
});
afterEach(cleanup);
const load = async () => { render(<EmployeeDirectory />); await screen.findByText(first().fullName); };

it("lists the toolbar in design order and shows the code column first after the chevron", async () => {
  await load();
  const toolbar = ["Thêm nhân viên", "Import file", "Xuất file", "Chọn trường hiển thị"].map(name => screen.getByRole("button", { name }));
  toolbar.slice(1).forEach((button, index) => expect(toolbar[index].compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy());
  expect((screen.getByRole("searchbox", { name: "Tìm nhân viên" }) as HTMLInputElement).placeholder).toBe("Theo mã, tên hoặc số điện thoại");
  const headers = screen.getAllByRole("columnheader").map(cell => cell.textContent);
  expect(headers.slice(0, 3)).toEqual(["", "Mở dòng", "Mã nhân viên"]);
  expect(screen.getByText("NV000001")).toBeTruthy();
  // The code is hideable and remembered.
  fireEvent.click(screen.getByRole("button", { name: "Chọn trường hiển thị" })); fireEvent.click(screen.getByRole("checkbox", { name: "Mã nhân viên" }));
  expect(screen.queryByRole("columnheader", { name: "Mã nhân viên" })).toBeNull(); expect(localStorage.getItem("omts-columns-employees")).not.toContain("code");
});

it("puts Loại nhân viên first in the filter column and sends it, with the job type, to the server", async () => {
  await load();
  const rail = screen.getByRole("group", { name: "Loại nhân viên" });
  const legends = [...document.querySelectorAll("legend")].map(legend => legend.textContent);
  expect(legends.slice(0, 4)).toEqual(["Loại nhân viên", "Tình trạng làm việc", "Vùng làm việc", "Loại công việc"]);
  fireEvent.click(within(rail).getByRole("radio", { name: "Thời vụ" }));
  await waitFor(() => expect(latestQuery()).toMatchObject({ employeeType: "SeasonalWorker", statusId: "401", page: "1" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Loại công việc" }), { target: { value: jobId } });
  await waitFor(() => expect(latestQuery()).toMatchObject({ employeeType: "SeasonalWorker", jobTypeId: jobId }));
  fireEvent.click(screen.getByRole("button", { name: "Đặt lại" }));
  // Empty values are dropped by the repository, so "cleared" means falsy here.
  await waitFor(() => expect(latestQuery().employeeType).toBeFalsy());
  expect(latestQuery().jobTypeId).toBeFalsy();
});

it("sorts on the server by header, flips the direction, and leaves the default order alone until a header is used", async () => {
  await load();
  expect(latestQuery().sortBy).toBeUndefined(); expect(latestQuery().sortDir).toBeUndefined();
  fireEvent.click(screen.getByRole("button", { name: "Số điện thoại" }));
  await waitFor(() => expect(latestQuery()).toMatchObject({ sortBy: "phone", sortDir: "asc", page: "1" }));
  expect(screen.getByRole("columnheader", { name: "Số điện thoại" }).getAttribute("aria-sort")).toBe("ascending");
  fireEvent.click(screen.getByRole("button", { name: "Số điện thoại" }));
  await waitFor(() => expect(latestQuery()).toMatchObject({ sortBy: "phone", sortDir: "desc" }));
  fireEvent.click(screen.getByRole("button", { name: "Mã nhân viên" }));
  await waitFor(() => expect(latestQuery()).toMatchObject({ sortBy: "code", sortDir: "asc" }));
  for (const name of ["Họ và tên", "Loại nhân viên", "Tình trạng"]) expect(screen.getByRole("button", { name })).toBeTruthy();
});

it("selecting a row never opens it; the bulk bar exports only the ticked rows with their order", async () => {
  await load();
  fireEvent.click(screen.getByRole("button", { name: "Số điện thoại" }));
  await waitFor(() => expect(latestQuery()).toMatchObject({ sortBy: "phone" }));
  await screen.findByText(second().fullName);
  fireEvent.click(screen.getByRole("checkbox", { name: `Chọn ${second().fullName}` }));
  expect(screen.queryByRole("region", { name: /Chi tiết/ })).toBeNull();
  expect(screen.getByRole("region", { name: "Thao tác hàng loạt" }).textContent).toContain("Đã chọn 1");
  fireEvent.click(screen.getByRole("button", { name: "Xuất file các dòng đã chọn" }));
  await waitFor(() => expect(files.exportFile).toHaveBeenCalledTimes(1));
  expect(files.exportFile).toHaveBeenCalledWith({ sortBy: "phone", sortDir: "asc" }, [second().id]);
});

it("select-all takes the visible page and the selection resets on filter, search, sort and page change", async () => {
  await load();
  const all = () => screen.getByRole("checkbox", { name: "Chọn tất cả trên trang" });
  const count = () => screen.queryByRole("region", { name: "Thao tác hàng loạt" })?.textContent ?? "";
  fireEvent.click(all()); expect(count()).toContain("Đã chọn 2");
  fireEvent.click(screen.getByRole("radio", { name: "Nhân viên" }));
  await waitFor(() => expect(count()).toBe(""));
  fireEvent.click(all()); expect(count()).toContain("Đã chọn 2");
  fireEvent.click(screen.getByRole("button", { name: "Họ và tên" }));
  await waitFor(() => expect(count()).toBe(""));
  fireEvent.click(all()); await waitFor(() => expect(all()).toBeTruthy());
  await waitFor(() => expect((screen.getByRole("button", { name: "Trang sau" }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
  await waitFor(() => expect(count()).toBe(""));
  fireEvent.click(all()); fireEvent.change(screen.getByRole("searchbox", { name: "Tìm nhân viên" }), { target: { value: "NV0000" } });
  await waitFor(() => expect(latestQuery()).toMatchObject({ search: "NV0000" }));
  await waitFor(() => expect(count()).toBe(""));
});

it("Xuất file exports the current filters and order, shows a pending state, and ignores a second click", async () => {
  let finish!: (value: unknown) => void;
  files.exportFile.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await load();
  fireEvent.click(screen.getByRole("radio", { name: "Thời vụ" }));
  await waitFor(() => expect(latestQuery()).toMatchObject({ employeeType: "SeasonalWorker" }));
  fireEvent.click(screen.getByRole("button", { name: "Mã nhân viên" }));
  await waitFor(() => expect(latestQuery()).toMatchObject({ sortBy: "code" }));
  const button = screen.getByRole("button", { name: "Xuất file" });
  fireEvent.click(button); fireEvent.click(button);
  expect(files.exportFile).toHaveBeenCalledTimes(1);
  expect(files.exportFile).toHaveBeenCalledWith({ search: "", statusId: "401", zoneId: "", employeeType: "SeasonalWorker", jobTypeId: "", sortBy: "code", sortDir: "asc" });
  expect(button.getAttribute("aria-busy")).toBe("true");
  finish({ status: "success", data: true });
  await waitFor(() => expect(button.getAttribute("aria-busy")).toBeNull());
  expect(screen.queryByRole("alert")).toBeNull();
});

it("shows the 5000-row refusal and other export failures in the standard error notice", async () => {
  files.exportFile.mockResolvedValueOnce({ status: "error", httpStatus: 400, code: "MSG-GEN-01", uncertain: false }).mockResolvedValueOnce({ status: "error", httpStatus: 0, uncertain: false });
  await load();
  fireEvent.click(screen.getByRole("button", { name: "Xuất file" }));
  expect((await screen.findByRole("alert")).textContent).toContain("tối đa 5.000 nhân viên");
  fireEvent.click(screen.getByRole("button", { name: "Xuất file" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Chưa kết nối được dịch vụ"));
});

it("Import file opens the dialog; a successful import refreshes the list and keeps the dialog on its result", async () => {
  files.importFile.mockResolvedValue({ status: "success", data: { imported: 2, errors: [] } });
  await load();
  const listCalls = () => repository.read.mock.calls.filter(call => call[0] === "list").length;
  const before = listCalls();
  fireEvent.click(screen.getByRole("button", { name: "Import file" }));
  const dialog = await screen.findByRole("dialog", { name: "Nhập nhân viên từ file" });
  fireEvent.change(within(dialog).getByLabelText("Chọn file"), { target: { files: [new File([new Uint8Array(4)], "nv.xlsx")] } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Nhập file" }));
  await waitFor(() => expect(listCalls()).toBeGreaterThan(before));
  expect(screen.getAllByText("Đã nhập 2 nhân viên.").length).toBeGreaterThan(0);
  fireEvent.click(within(dialog).getByRole("button", { name: "Đóng" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});
