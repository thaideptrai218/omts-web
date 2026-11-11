// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read: state.read, write: state.write }) }));
import { businessToday } from "@/features/operations/ui";
import { JobTypesScreen } from "./job-types-screen";

const job = (n: number, extra: object = {}) => ({ id: `00000000-0000-4000-8000-00000000000${n}`, name: `Công việc ${n}`, statusId: 101, status: "InUse", rowVersion: `v${n}`,
  currentRate: { hourlyRate: 25000, effectiveFrom: "2026-01-01" }, otherRates: [{ hourlyRate: 20000, effectiveFrom: "2025-01-01" }], ...extra });
const page = (items = [job(1), job(2)], total = items.length) => ({ status: "success", data: { items, total, page: 1, pageSize: 20 } });
const failure = (code: string, httpStatus = 409) => ({ status: "error", httpStatus, code, uncertain: false });
const lastList = () => state.read.mock.calls.filter(call => call[0] === "list").at(-1)![1];

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  try { window.localStorage.clear(); } catch { /* storage may be unavailable */ }
  state.read.mockImplementation(async (action: string) => action === "list" ? page() : { status: "success", data: job(1, { name: "Bản mới", rowVersion: "v9" }) });
  state.write.mockResolvedValue({ status: "success", data: job(1, { name: "Đã lưu", rowVersion: "v2" }) });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function open(user: ReturnType<typeof userEvent.setup>, name = "Công việc 1") {
  render(<JobTypesScreen />);
  await screen.findByText(name);
  await user.click(screen.getByRole("button", { name: `Mở ${name}` }));
}

it("shows only the chevron button on closed rows and keeps one row open at a time", async () => {
  const user = userEvent.setup();
  render(<JobTypesScreen />);
  const first = (await screen.findByText("Công việc 1")).closest("tr")!;
  expect(within(first).getAllByRole("button")).toHaveLength(1);
  expect(screen.queryByText("Mở hồ sơ")).toBeNull();
  await user.click(screen.getByText("Công việc 1"));
  expect(screen.getByRole("tablist")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Mở Công việc 2" }));
  expect(screen.getAllByRole("tablist")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Mở Công việc 1" }).getAttribute("aria-expanded")).toBe("false");
  screen.getByRole("button", { name: "Thu gọn Công việc 2" }).focus();
  await user.keyboard("{Enter}");
  expect(screen.queryByRole("tablist")).toBeNull();
});

it("sends the status pill and the page to the list query", async () => {
  const user = userEvent.setup();
  state.read.mockImplementation(async (action: string) => action === "list" ? page([job(1)], 45) : failure("x"));
  render(<JobTypesScreen />);
  await screen.findByText("Công việc 1");
  expect(lastList()).toMatchObject({ page: "1", pageSize: "20" });
  await user.click(screen.getByRole("button", { name: "Trang sau" }));
  await waitFor(() => expect(lastList()).toMatchObject({ page: "2" }));
  await user.click(screen.getByLabelText("Đang dùng"));
  await waitFor(() => expect(lastList()).toMatchObject({ statusId: "101", page: "1" }));
  await user.click(screen.getByLabelText("Ngừng dùng"));
  await waitFor(() => expect(lastList()).toMatchObject({ statusId: "102" }));
});

it("sorts on the server: default order untouched, header click sends sortBy and sortDir, second click flips it", async () => {
  const user = userEvent.setup();
  render(<JobTypesScreen />);
  await screen.findByText("Công việc 1");
  expect(lastList()).not.toHaveProperty("sortBy", expect.anything());
  await user.click(screen.getByRole("button", { name: "Đơn giá hiện tại / giờ" }));
  await waitFor(() => expect(lastList()).toMatchObject({ sortBy: "rate", sortDir: "asc", page: "1" }));
  await user.click(screen.getByRole("button", { name: "Đơn giá hiện tại / giờ" }));
  await waitFor(() => expect(lastList()).toMatchObject({ sortBy: "rate", sortDir: "desc" }));
  await user.click(screen.getByRole("button", { name: "Hiệu lực từ" }));
  await waitFor(() => expect(lastList()).toMatchObject({ sortBy: "effectiveFrom", sortDir: "asc" }));
});

it("renames in place: Bỏ qua discards, Lưu sends the rename with the row version", async () => {
  const user = userEvent.setup();
  await open(user);
  await user.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
  await user.clear(screen.getByLabelText("Tên loại công việc"));
  await user.type(screen.getByLabelText("Tên loại công việc"), "Tên khác");
  await user.click(screen.getByRole("button", { name: "Bỏ qua" }));
  expect(screen.queryByLabelText("Tên loại công việc")).toBeNull();
  expect(state.write).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
  await user.clear(screen.getByLabelText("Tên loại công việc"));
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  expect((await screen.findAllByRole("alert"))[0].textContent).toContain("Nhập tên loại công việc");
  expect(state.write).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText("Tên loại công việc"), "Đã lưu");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.write).toHaveBeenCalledWith("rename", { name: "Đã lưu", rowVersion: "v1" }, expect.anything(), job(1).id));
  expect((await screen.findAllByText("Đã lưu")).length).toBeGreaterThan(0);
});

it("never reuses the Chỉnh sửa / Thêm mốc button node as the submit button (browser would submit at once)", async () => {
  const user = userEvent.setup();
  await open(user);
  const edit = screen.getByRole("button", { name: "Chỉnh sửa" });
  await user.click(edit);
  expect(edit.isConnected).toBe(false);
  expect(screen.getByRole("button", { name: "Lưu" })).not.toBe(edit);
  expect(state.write).not.toHaveBeenCalled();
  await user.click(screen.getByRole("tab", { name: "Lịch sử đơn giá" }));
  const add = screen.getByRole("button", { name: "Thêm mốc đơn giá" });
  await user.click(add);
  expect(add.isConnected).toBe(false);
  expect(screen.getByRole("button", { name: "Lưu" })).not.toBe(add);
  expect(state.write).not.toHaveBeenCalled();
});

async function startRate(user: ReturnType<typeof userEvent.setup>) {
  await open(user);
  await user.click(screen.getByRole("tab", { name: "Lịch sử đơn giá" }));
  expect(screen.getByText("Hiện tại")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Thêm mốc đơn giá" }));
}

it("adds a rate point inline and validates the rate before sending", async () => {
  const user = userEvent.setup();
  await startRate(user);
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  expect((await screen.findAllByRole("alert"))[0].textContent).toContain("số nguyên dương");
  expect(state.write).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText("Đơn giá mới (đồng/giờ)"), "30000");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.write).toHaveBeenCalledWith("rate", { hourlyRate: 30000, effectiveFrom: businessToday(), rowVersion: "v1" }, expect.anything(), job(1).id));
  await waitFor(() => expect(screen.getByRole("button", { name: "Thêm mốc đơn giá" })).toBeTruthy());
});

it("discards the inline rate row on Bỏ qua", async () => {
  const user = userEvent.setup();
  await startRate(user);
  await user.type(screen.getByLabelText("Đơn giá mới (đồng/giờ)"), "1");
  await user.click(screen.getByRole("button", { name: "Bỏ qua" }));
  expect(screen.queryByLabelText("Đơn giá mới (đồng/giờ)")).toBeNull();
  expect(state.write).not.toHaveBeenCalled();
});

it("shows a rate that cannot cover a finalized month inline and keeps the draft", async () => {
  const user = userEvent.setup();
  state.write.mockResolvedValue(failure("MSG-LABOR-04"));
  await startRate(user);
  await user.type(screen.getByLabelText("Đơn giá mới (đồng/giờ)"), "30000");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  expect((await screen.findByText(/đã chốt lương/)).getAttribute("role")).toBe("alert");
  expect((screen.getByLabelText("Đơn giá mới (đồng/giờ)") as HTMLInputElement).value).toBe("30.000");
});

it("blocks on a version conflict (MSG06), keeps the draft and saves again after re-reading", async () => {
  const user = userEvent.setup();
  state.write.mockResolvedValueOnce(failure("MSG06"));
  await startRate(user);
  await user.type(screen.getByLabelText("Đơn giá mới (đồng/giờ)"), "30000");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await user.click(await screen.findByRole("button", { name: "Đọc hồ sơ hiện tại" }));
  expect((await screen.findByText(/Đã đọc hồ sơ hiện tại/)).textContent).toContain("Bản mới");
  expect((screen.getByLabelText("Đơn giá mới (đồng/giờ)") as HTMLInputElement).value).toBe("30.000");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.write).toHaveBeenLastCalledWith("rate", expect.objectContaining({ rowVersion: "v9" }), expect.anything(), job(1).id));
});

it("confirms before discontinuing and sends the row version", async () => {
  const user = userEvent.setup();
  await open(user);
  await user.click(screen.getByRole("button", { name: "Ngừng dùng" }));
  expect(state.write).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.write).toHaveBeenCalledWith("discontinue", { rowVersion: "v1" }, expect.anything(), job(1).id));
});

it("offers Dùng lại for a discontinued job", async () => {
  const user = userEvent.setup();
  state.read.mockImplementation(async () => page([job(1, { statusId: 102 })]));
  await open(user);
  await user.click(screen.getByRole("button", { name: "Dùng lại" }));
  await user.click(screen.getByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.write).toHaveBeenCalledWith("resume", { rowVersion: "v1" }, expect.anything(), job(1).id));
});

it("creates a job type from the dialog after confirmation", async () => {
  const user = userEvent.setup();
  render(<JobTypesScreen />);
  await screen.findByText("Công việc 1");
  await user.click(screen.getByRole("button", { name: /Thêm loại công việc/ }));
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  expect(state.write).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText("Tên loại công việc *"), "Phân loại hàu");
  await user.type(screen.getByLabelText("Đơn giá mỗi giờ *"), "27000");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await user.click(await screen.findByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.write).toHaveBeenCalledWith("create", { name: "Phân loại hàu", hourlyRate: 27000, effectiveFrom: businessToday() }, expect.anything()));
  expect(await screen.findByText(/Đã thêm loại công việc/)).toBeTruthy();
});
