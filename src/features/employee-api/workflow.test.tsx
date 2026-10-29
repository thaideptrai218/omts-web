// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { EmployeeApiEditor } from "./employee-screen";
import { employeeDetailFixture, workingZoneId, linkedAccountId } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";
const fixture = () => employeeViewSchema.parse(employeeDetailFixture());
const props = () => ({ record: fixture(), zones: [{ id: workingZoneId, code: "V01", name: "Vùng Đông", statusId: 101 }], accounts: [], lookupsReady: true, onClose: vi.fn(), onAdopt: vi.fn(), onSaved: vi.fn(), onUnlinked: vi.fn(), onReloadAccounts: vi.fn() });
beforeEach(() => vi.clearAllMocks()); afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("employee API editor lifecycle", () => {
  it("keeps personal drafts and the new rowVersion after unlinking", async () => {
    const callbacks = props(), unlinked = { ...fixture(), account: null, rowVersion: "AQID" };
    repository.write.mockResolvedValueOnce({ status: "success", data: unlinked }).mockResolvedValueOnce({ status: "success", data: unlinked });
    render(<EmployeeApiEditor {...callbacks} />);
    fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Bản nháp trước unlink" } });
    expect((screen.getByRole("button", { name: "Nghỉ việc" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Bỏ liên kết tài khoản" })); expect(repository.write).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận bỏ liên kết" }));
    await waitFor(() => expect(callbacks.onUnlinked).toHaveBeenCalledWith(unlinked));
    expect((screen.getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe("Bản nháp trước unlink");
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(2));
    expect(repository.write.mock.calls[1][1]).toMatchObject({ notes: "Bản nháp trước unlink", accountId: null, rowVersion: "AQID" });
  });
  it("does not silently save or discard drafts to start an employment transition", async () => {
    render(<EmployeeApiEditor {...props()} />);
    fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Bản nháp" } });
    fireEvent.click(screen.getByRole("button", { name: "Nghỉ việc" })); expect(screen.queryByRole("dialog", { name: "Nghỉ việc?" })).toBeNull(); expect(repository.write).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Hủy thay đổi" })); fireEvent.click(screen.getByRole("button", { name: "Nghỉ việc" }));
    expect(screen.getByRole("dialog", { name: "Nghỉ việc?" })).toBeTruthy(); expect(repository.write).not.toHaveBeenCalled();
  });
  it("confirms employment separately and forwards the account follow-up without locking it", async () => {
    const callbacks = props(), next = { employee: { ...fixture(), status: "Left" as const, employmentEndDate: "2026-10-29" }, followUp: { action: "review-lock" as const, accountId: linkedAccountId } };
    repository.write.mockResolvedValue({ status: "success", data: next }); render(<EmployeeApiEditor {...callbacks} />);
    fireEvent.click(screen.getByRole("button", { name: "Nghỉ việc" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận nghỉ việc" }));
    await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledWith(next.employee, next));
    expect(repository.write).toHaveBeenCalledTimes(1); expect(repository.write.mock.calls[0][0]).toBe("end-employment"); expect(repository.write.mock.calls[0][1].rowVersion).toBe(fixture().rowVersion);
  });
  it("retains a conflict draft and only uses the explicitly reviewed rowVersion on the next save", async () => {
    const latest = { ...fixture(), notes: "Người khác sửa", rowVersion: "AQID" };
    repository.write.mockResolvedValueOnce({ status: "error", code: "MSG06", httpStatus: 409, uncertain: false }).mockResolvedValueOnce({ status: "success", data: latest }); repository.read.mockResolvedValue({ status: "success", data: latest });
    render(<EmployeeApiEditor {...props()} />); fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Bản nháp của tôi" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" })); fireEvent.click(await screen.findByRole("button", { name: "Tải hồ sơ mới để đối chiếu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đã đối chiếu, giữ bản nháp để sửa tiếp" }));
    expect(repository.write).toHaveBeenCalledTimes(1); expect((screen.getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe("Bản nháp của tôi");
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" })); await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(2)); expect(repository.write.mock.calls[1][1].rowVersion).toBe("AQID");
  });
  it("never repeats an uncertain write, including after a successful comparison read", async () => {
    repository.write.mockResolvedValue({ status: "error", httpStatus: 401, uncertain: true }); repository.read.mockResolvedValue({ status: "success", data: fixture() });
    render(<EmployeeApiEditor {...props()} />); fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Bản nháp" } }); fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    fireEvent.click(await screen.findByRole("button", { name: "Tải hồ sơ mới để đối chiếu" })); await screen.findByText("Hồ sơ hiện tại trên hệ thống");
    expect(screen.queryByRole("button", { name: "Đã đối chiếu, giữ bản nháp để sửa tiếp" })).toBeNull(); expect((screen.getByRole("button", { name: "Lưu hồ sơ" }) as HTMLButtonElement).disabled).toBe(true); expect(repository.write).toHaveBeenCalledTimes(1);
  });
  it("blocks incomplete bank details and stopped working zones until the user fixes them", async () => {
    const callbacks = props(); callbacks.zones[0].statusId = 102; render(<EmployeeApiEditor {...callbacks} />);
    fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Bản nháp" } }); fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await screen.findByText("Bỏ chọn vùng đã ngừng hoặc chưa có trong danh mục trước khi lưu."); expect(repository.write).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: /đã ngừng/ })); expect(screen.queryByRole("checkbox", { name: /Vùng Đông/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Số tài khoản", { exact: true }), { target: { value: "" } }); fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await screen.findByRole("alert"); expect(repository.write).not.toHaveBeenCalled(); expect(screen.getByLabelText("Số tài khoản", { exact: true }).getAttribute("aria-invalid")).toBe("true");
  });
  it("does not publish a save result after the editor unmounts", async () => {
    const callbacks = props(); let finish!: (result: unknown) => void; repository.write.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const view = render(<EmployeeApiEditor {...callbacks} />); fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Bản nháp" } }); fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    view.unmount(); finish({ status: "success", data: fixture() }); await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1)); expect(callbacks.onSaved).not.toHaveBeenCalled();
  });
  it("opens the linked employee for comparison only after a click and keeps the current draft", async () => {
    repository.write.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG03", uncertain: false, employeeProblem: { kind: "duplicate-employee", existingEmployeeId: fixture().id } }); repository.read.mockResolvedValue({ status: "success", data: fixture() });
    render(<EmployeeApiEditor {...props()} />); fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Nháp không mất" } }); fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    const button = await screen.findByRole("button", { name: "Đối chiếu hồ sơ hiện có" }); expect(repository.read).not.toHaveBeenCalled(); fireEvent.click(button); await screen.findByText("Hồ sơ hiện tại trên hệ thống"); expect((screen.getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe("Nháp không mất");
  });
  it("uses the approved MSG24 copy and only opens the linked profile after an explicit click", async () => {
    const callbacks = props();
    repository.write.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG24", uncertain: false, employeeProblem: { kind: "account-already-linked", existingEmployeeId: fixture().id } }); repository.read.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: true }).mockResolvedValueOnce({ status: "success", data: fixture() });
    render(<EmployeeApiEditor {...callbacks} />); fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Bản nháp MSG24" } }); fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await screen.findByText("Tài khoản này đã được liên kết với hồ sơ nhân viên khác."); expect(repository.read).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Mở hồ sơ đang liên kết" })); await waitFor(() => expect(repository.read).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((screen.getByRole("button", { name: "Mở hồ sơ đang liên kết" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Mở hồ sơ đang liên kết" })); await screen.findByText("Hồ sơ hiện tại trên hệ thống");
    expect((screen.getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe("Bản nháp MSG24"); expect(callbacks.onAdopt).not.toHaveBeenCalled(); expect(callbacks.onSaved).not.toHaveBeenCalled();
  });
  it("asks before discarding a draft and leaves the form intact on continue", () => {
    const callbacks = props(); render(<EmployeeApiEditor {...callbacks} />); fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Nháp" } }); fireEvent.click(screen.getByRole("button", { name: "Đóng hồ sơ" }));
    expect(callbacks.onClose).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole("button", { name: "Tiếp tục sửa" })); expect((screen.getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe("Nháp");
  });
  it("adopts reviewed data without reporting that another save took place", async () => {
    const callbacks = props(), latest = { ...fixture(), rowVersion: "AQID" };
    repository.write.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG06", uncertain: false }); repository.read.mockResolvedValue({ status: "success", data: latest });
    render(<EmployeeApiEditor {...callbacks} />); fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Nháp" } }); fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    fireEvent.click(await screen.findByRole("button", { name: "Tải hồ sơ mới để đối chiếu" })); fireEvent.click(await screen.findByRole("button", { name: "Dùng dữ liệu đã lưu" }));
    expect(callbacks.onAdopt).toHaveBeenCalledWith(latest); expect(callbacks.onSaved).not.toHaveBeenCalled(); expect(repository.write).toHaveBeenCalledTimes(1);
  });
  it("does not submit twice while an employment request is pending", async () => {
    let finish!: (result: unknown) => void; repository.write.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    render(<EmployeeApiEditor {...props()} />); fireEvent.click(screen.getByRole("button", { name: "Nghỉ việc" }));
    const dialog = screen.getByRole("dialog", { name: "Nghỉ việc?" }), button = within(dialog).getByRole("button", { name: "Xác nhận nghỉ việc" });
    fireEvent.submit(button.closest("form")!); fireEvent.submit(button.closest("form")!); expect(repository.write).toHaveBeenCalledTimes(1);
    finish({ status: "error", httpStatus: 409, code: "MSG11", uncertain: false }); await screen.findByText(/Bản ghi đang được sử dụng/);
  });
});
