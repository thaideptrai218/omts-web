// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ context: { identity: { subjectType: "CooperativeOwner" } }, request: vi.fn() }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("./repository", () => ({ certificationRequest: state.request }));
import { CertificationsScreen } from "./certifications-screen";
import { ToastProvider } from "@/components/ui/toast-provider";

const make = (n: number, state: "Valid" | "ExpiringSoon" | "Expired", expiryDate: string) => ({
  id: `122bb318-a72e-49aa-a8d7-a6169f88900${n}`, name: `Chứng nhận ${n}`, number: `SO-${n}`, issuer: `Đơn vị ${n}`, expiryDate, state, fileUrl: n === 1 ? "https://files.example/cert-1.pdf" : null, rowVersion: `v${n}`,
});
const rows = [make(1, "Valid", "2027-06-30"), make(2, "ExpiringSoon", "2026-12-15"), make(3, "Expired", "2026-01-02")];
const render_ = () => render(<ToastProvider><CertificationsScreen /></ToastProvider>);
const calls = (action: string) => state.request.mock.calls.filter(([name]) => name === action);

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* storage may be unavailable */ }
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
  state.context.identity.subjectType = "CooperativeOwner";
  state.request.mockImplementation(async (action: string) => action === "list" ? { status: "success", data: rows } : { status: "success", data: action === "remove" ? { messageCode: "MSG" } : { certification: { ...rows[0], name: "Đã sửa" } } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("lists the certifications with their validity and keeps the owner-only gate", async () => {
  render_();
  expect(await screen.findByText("Chứng nhận 1")).toBeTruthy();
  for (const heading of ["Chứng nhận", "Số", "Đơn vị cấp", "Ngày hết hạn", "Hiệu lực"]) expect(screen.getByRole("columnheader", { name: heading })).toBeTruthy();
  expect(screen.getByText("30/06/2027")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Chỉnh sửa" })).toBeNull();
  cleanup();
  state.context.identity.subjectType = "Staff";
  state.request.mockClear();
  render_();
  expect(screen.getByRole("alert").textContent).toContain("Bạn không có quyền");
  expect(state.request).not.toHaveBeenCalled();
});

it("filters by validity pill and by search text", async () => {
  const user = userEvent.setup();
  render_();
  await screen.findByText("Chứng nhận 1");
  await user.click(screen.getByLabelText("Đã hết hạn"));
  expect(screen.queryByText("Chứng nhận 1")).toBeNull();
  expect(screen.getByText("Chứng nhận 3")).toBeTruthy();
  await user.click(screen.getByLabelText("Tất cả"));
  await user.type(screen.getByRole("searchbox", { name: "Tìm chứng nhận" }), "don vi 2");
  expect(screen.getByText("Chứng nhận 2")).toBeTruthy();
  expect(screen.queryByText("Chứng nhận 1")).toBeNull();
});

it("opens a row to its information and the attached file link", async () => {
  const user = userEvent.setup();
  render_();
  await user.click(await screen.findByText("Chứng nhận 1"));
  const panel = await screen.findByRole("region", { name: "Chi tiết chứng nhận" });
  expect(within(panel).getByRole("tab", { name: "Thông tin" })).toBeTruthy();
  expect(within(panel).getByRole("link", { name: "Mở tệp chứng nhận" }).getAttribute("href")).toBe("https://files.example/cert-1.pdf");
  expect(within(panel).getByRole("button", { name: "Xóa" })).toBeTruthy();
});

it("edits in the open row with Bỏ qua and Lưu and toasts after saving", async () => {
  const user = userEvent.setup();
  render_();
  await user.click(await screen.findByText("Chứng nhận 1"));
  await user.click(await screen.findByRole("button", { name: "Chỉnh sửa" }));
  const name = screen.getByLabelText("Tên chứng nhận *");
  expect((screen.getByRole("button", { name: "Lưu" }) as HTMLButtonElement).disabled).toBe(true);
  await user.clear(name);
  await user.type(name, "Đã sửa");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(calls("update")).toHaveLength(1));
  expect(calls("update")[0][2]).toBe(rows[0].id);
  expect(calls("update")[0][3]).toMatchObject({ name: "Đã sửa", number: "SO-1", issuer: "Đơn vị 1", expiryDate: "2027-06-30", rowVersion: "v1" });
  expect(await screen.findByText("Đã lưu chứng nhận Đã sửa.")).toBeTruthy();
  expect(calls("list").length).toBeGreaterThan(1);
});

it("cancels an inline edit without writing", async () => {
  const user = userEvent.setup();
  render_();
  await user.click(await screen.findByText("Chứng nhận 1"));
  await user.click(await screen.findByRole("button", { name: "Chỉnh sửa" }));
  await user.click(screen.getByRole("button", { name: "Bỏ qua" }));
  expect(await screen.findByRole("button", { name: "Chỉnh sửa" })).toBeTruthy();
  expect(state.request.mock.calls.some(([name]) => name === "update")).toBe(false);
});

it("asks before deleting, then deletes and toasts", async () => {
  const user = userEvent.setup();
  render_();
  await user.click(await screen.findByText("Chứng nhận 2"));
  await user.click(await screen.findByRole("button", { name: "Xóa" }));
  expect(calls("remove")).toHaveLength(0);
  const dialog = await screen.findByRole("dialog");
  expect(dialog.textContent).toContain("Xóa chứng nhận “Chứng nhận 2”");
  await user.click(within(dialog).getByRole("button", { name: /Xóa|Đồng ý|Xác nhận/ }));
  await waitFor(() => expect(calls("remove")).toHaveLength(1));
  expect(calls("remove")[0][2]).toBe(rows[1].id);
  expect(await screen.findByText("Đã xóa chứng nhận Chứng nhận 2.")).toBeTruthy();
});

it("creates a certification in a dialog that needs its file", async () => {
  const user = userEvent.setup();
  render_();
  await screen.findByText("Chứng nhận 1");
  await user.click(screen.getByRole("button", { name: /Thêm chứng nhận/ }));
  const dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByLabelText("Tên chứng nhận *"), "VietGAP");
  await user.type(within(dialog).getByLabelText("Ngày hết hạn *"), "01012030");
  fireEvent.submit(dialog.querySelector("form")!);
  expect(await within(dialog).findByText("Vui lòng chọn tệp chứng nhận.")).toBeTruthy();
  expect(calls("create")).toHaveLength(0);
  const file = new File(["%PDF"], "vietgap.pdf", { type: "application/pdf" });
  await user.upload(within(dialog).getByLabelText(/Tệp chứng nhận/), file);
  // jsdom does not see the files user-event attaches when it checks `required`, so the submit event is sent directly.
  fireEvent.submit(dialog.querySelector("form")!);
  await waitFor(() => expect(calls("create")).toHaveLength(1));
  expect(calls("create")[0][4]).toBe(file);
  expect(await screen.findByText("Đã tạo chứng nhận Đã sửa.")).toBeTruthy();
});
