// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
const files = vi.hoisted(() => ({ setPhoto: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
vi.mock("./employee-file-repository", () => ({ employeeFileRepository: files }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
vi.mock("@/features/address-invoice/address-fields", () => ({ AddressFields: ({ onChange, value }: { onChange(next: unknown): void; value: { street: string } }) =>
  <button type="button" onClick={() => onChange({ provinceCode: 92, provinceName: "Thành phố Cần Thơ", wardCode: 31117, wardName: "Phường Ninh Kiều", street: value.street })}>Chọn địa chỉ</button> }));
import { employeeDetailFixture, workingZoneId } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";
import { EmployeeFormDialog } from "./employee-form-dialog";

const saved = () => employeeViewSchema.parse(employeeDetailFixture());
const zones = [{ id: workingZoneId, code: "V01", name: "Vùng Đông", statusId: 101 }];
const props = (record = null as ReturnType<typeof saved> | null, canAccount = true) => ({ record, zones, lookupsReady: true, canAccount, onClose: vi.fn(), onAdopt: vi.fn(), onSaved: vi.fn() });
const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:preview"); URL.revokeObjectURL = vi.fn();
  repository.read.mockResolvedValue({ status: "success", data: { items: [{ id: "3cb5c590-e3db-4056-8f7f-a03a6efbbd4b", username: "nhan.vien", displayName: "Nhân Viên", phoneNumber: null }] } });
});
afterEach(cleanup);

it("opens the identity card with the photo panel and folds the other cards, without a job type field", () => {
  render(<EmployeeFormDialog {...props()} />);
  expect(screen.getByRole("dialog", { name: "Thêm mới nhân viên" })).toBeTruthy();
  expect((screen.getByLabelText("Mã nhân viên") as HTMLInputElement).placeholder).toBe("Tự động");
  expect(screen.getByRole("button", { name: "Thêm ảnh" })).toBeTruthy(); expect(screen.getByText("Mỗi ảnh không vượt quá 2MB")).toBeTruthy();
  for (const title of ["Thông tin công việc", "Thông tin ngân hàng", "Thông tin cá nhân"]) expect(screen.getByText(title).closest("details")!.hasAttribute("open")).toBe(false);
  expect(screen.queryByText(/Loại công việc/)).toBeNull();
});
it("creates with the picked address codes, then uploads the photo of the saved profile", async () => {
  repository.write.mockResolvedValue({ status: "success", data: saved() });
  files.setPhoto.mockResolvedValue({ status: "success", data: { ...saved(), photoUrl: "/api/files/local/employee-photos/a.png" } });
  const onSaved = vi.fn(), view = props(); view.onSaved = onSaved;
  render(<EmployeeFormDialog {...view} />);
  fill("Tên nhân viên *", "Người mới"); fill("Số điện thoại *", "0912345678"); fill("Loại nhân viên *", "Staff"); fill("Thêm vùng làm việc", workingZoneId);
  fireEvent.click(screen.getByRole("button", { name: "Chọn địa chỉ" }));
  const photo = new File([new Uint8Array(8)], "a.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Ảnh nhân viên"), { target: { files: [photo] } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(repository.write).toHaveBeenCalledWith("create", expect.objectContaining({ fullName: "Người mới", phoneNumber: "0912345678", provinceCode: 92, wardCode: 31117, area: "Thành phố Cần Thơ", workingZoneIds: [workingZoneId], jobTypeIds: [] }), expect.anything());
  expect(files.setPhoto).toHaveBeenCalledWith(saved().id, photo);
  expect(onSaved.mock.calls[0][1]).toEqual([]);
});
it("keeps the saved profile and reports the photo as a follow-up problem when the upload fails", async () => {
  repository.write.mockResolvedValue({ status: "success", data: saved() });
  files.setPhoto.mockResolvedValue({ status: "error", httpStatus: 400, code: "MSG-GEN-01", uncertain: false });
  const view = props(); render(<EmployeeFormDialog {...view} />);
  fill("Tên nhân viên *", "Người mới"); fill("Số điện thoại *", "0912345678"); fill("Loại nhân viên *", "SeasonalWorker");
  fireEvent.change(screen.getByLabelText("Ảnh nhân viên"), { target: { files: [new File([new Uint8Array(8)], "a.png", { type: "image/png" })] } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(view.onSaved).toHaveBeenCalled());
  expect(view.onSaved.mock.calls[0][1][0]).toMatch(/^chưa cập nhật được ảnh/);
});
it("rejects a photo that is not a JPEG or PNG or is over 2 MB, inline in the dialog", () => {
  render(<EmployeeFormDialog {...props()} />);
  fireEvent.change(screen.getByLabelText("Ảnh nhân viên"), { target: { files: [new File([new Uint8Array(8)], "a.gif", { type: "image/gif" })] } });
  expect(screen.getByRole("alert").textContent).toContain("JPEG hoặc PNG");
  fireEvent.change(screen.getByLabelText("Ảnh nhân viên"), { target: { files: [new File([new Uint8Array(2 * 1024 * 1024 + 1)], "a.png", { type: "image/png" })] } });
  expect(screen.getByRole("alert").textContent).toContain("2 MB");
});
it("updates with the row version, links a chosen account and shows no account choice to a non-Owner", async () => {
  const record = { ...saved(), account: null, hasStaffAccount: false, status: "Employed" as const };
  repository.write.mockImplementation(async (action: string) => ({ status: "success", data: action === "update" ? record : { ...record, account: { id: "3cb5c590-e3db-4056-8f7f-a03a6efbbd4b", username: "nhan.vien", displayName: "Nhân Viên", status: "Active" } } }));
  const view = props(record); render(<EmployeeFormDialog {...view} />);
  expect(screen.getByRole("dialog", { name: "Cập nhật nhân viên" })).toBeTruthy();
  await waitFor(() => expect(within(screen.getByRole("dialog")).getByLabelText("Tài khoản đăng nhập")).toBeTruthy());
  fill("Tài khoản đăng nhập", "3cb5c590-e3db-4056-8f7f-a03a6efbbd4b");
  fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(view.onSaved).toHaveBeenCalled());
  expect(repository.write).toHaveBeenCalledWith("update", expect.objectContaining({ rowVersion: record.rowVersion }), expect.anything(), record.id);
  expect(repository.write).toHaveBeenCalledWith("link-account", { accountId: "3cb5c590-e3db-4056-8f7f-a03a6efbbd4b" }, expect.anything(), record.id);
  expect(view.onSaved.mock.calls[0][0].account?.username).toBe("nhan.vien");
  cleanup();
  render(<EmployeeFormDialog {...props(record, false)} />);
  expect(screen.queryByLabelText("Tài khoản đăng nhập")).toBeNull();
});
it("locks the fields the backend ignores for an employee who has left and turns the photo off", () => {
  render(<EmployeeFormDialog {...props({ ...saved(), status: "Left" as const })} />);
  expect((screen.getByLabelText("Tên nhân viên *") as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByLabelText("Số điện thoại *") as HTMLInputElement).disabled).toBe(false);
  expect((screen.getByLabelText("Ảnh nhân viên") as HTMLInputElement).disabled).toBe(true);
});
