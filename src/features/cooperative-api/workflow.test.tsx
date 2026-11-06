// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
const repository = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn(), upload: vi.fn(), remove: vi.fn() }));
vi.mock("./repository", () => ({ createCooperativeRepository: () => repository }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { CooperativeApiEditor } from "./cooperative-screen";
import { cooperativeFixture } from "./fixtures";
beforeEach(() => vi.clearAllMocks()); afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function edit() { fireEvent.change(screen.getByLabelText("Tên hợp tác xã"), { target: { value: "Tên nháp của tôi" } }); }
async function save() { fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" })); fireEvent.click(await screen.findByRole("button", { name: "Xác nhận lưu" })); }
function selectLogo() { fireEvent.change(screen.getByLabelText("Chọn logo"), { target: { files: [new File(["png"], "logo.png", { type: "image/png" })] } }); }
describe("cooperative API workflow", () => {
  it("validates preliminary fields and industry rows before confirmation", async () => {
    render(<CooperativeApiEditor initial={{ ...cooperativeFixture(), taxCode: null, officeAddress: null, businessLines: [] }} />); edit(); fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    expect(screen.queryByRole("dialog")).toBeNull(); expect(screen.getByLabelText("Mã số thuế").getAttribute("aria-invalid")).toBe("true"); expect(repository.save).not.toHaveBeenCalled();
  });
  it("previews only name/address, confirms once and sends editable business lines", async () => {
    repository.save.mockResolvedValue({ status: "success", data: { ...cooperativeFixture(), fullName: "Tên nháp của tôi", rowVersion: "new" } }); render(<CooperativeApiEditor initial={cooperativeFixture()} />); edit();
    fireEvent.click(screen.getByRole("button", { name: "Thêm ngành nghề" })); fireEvent.change(screen.getByLabelText("Ngành nghề 2"), { target: { value: "  Chế biến hàu  " } });
    const preview = screen.getByRole("region", { name: "Xem trước thông tin truy xuất" }); expect(preview.textContent).not.toContain(cooperativeFixture().phoneNumber); expect(preview.textContent).not.toContain(cooperativeFixture().taxCode);
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" })); expect(repository.save).not.toHaveBeenCalled(); fireEvent.click(await screen.findByRole("button", { name: "Xác nhận lưu" }));
    await screen.findByText("Đã lưu hồ sơ hợp tác xã."); expect(repository.save).toHaveBeenCalledTimes(1); expect(repository.save.mock.calls[0][0].businessLines).toEqual(["Nuôi hàu", "Chế biến hàu"]);
  });
  it("retains text drafts after a separately saved logo and uses the returned version", async () => {
    repository.upload.mockResolvedValue({ status: "success", data: { ...cooperativeFixture(), rowVersion: "new", logoUrl: "/api/cooperative/profile/logo?version=new" } }); repository.save.mockResolvedValue({ status: "success", data: cooperativeFixture() });
    render(<CooperativeApiEditor initial={cooperativeFixture()} />); edit(); selectLogo(); fireEvent.click(screen.getByRole("button", { name: "Tải logo lên" })); await screen.findByText(/Đã cập nhật logo/);
    expect((screen.getByLabelText("Tên hợp tác xã") as HTMLInputElement).value).toBe("Tên nháp của tôi"); await save(); await waitFor(() => expect(repository.save).toHaveBeenCalledTimes(1)); expect(repository.save.mock.calls[0][0].rowVersion).toBe("new");
  });
  it("requires comparison when a logo save observes an intervening text update", async () => {
    repository.upload.mockResolvedValue({ status: "success", data: { ...cooperativeFixture(), officeAddress: "Người khác sửa", rowVersion: "new" } }); render(<CooperativeApiEditor initial={cooperativeFixture()} />); edit(); selectLogo(); fireEvent.click(screen.getByRole("button", { name: "Tải logo lên" }));
    await screen.findByText(/Bản ghi đã thay đổi/); expect((screen.getByRole("button", { name: "Lưu hồ sơ" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("Tên hợp tác xã") as HTMLInputElement).value).toBe("Tên nháp của tôi"); expect(repository.save).not.toHaveBeenCalled();
  });
  it("confirms removal and preserves the draft", async () => {
    repository.remove.mockResolvedValue({ status: "success", data: { ...cooperativeFixture(), rowVersion: "new" } }); render(<CooperativeApiEditor initial={{ ...cooperativeFixture(), logoUrl: "/api/cooperative/profile/logo?version=old" }} />); edit();
    fireEvent.click(screen.getByRole("button", { name: "Xóa logo" })); expect(repository.remove).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole("button", { name: "Xác nhận xóa logo" })); await screen.findByText("Chưa có logo."); expect((screen.getByLabelText("Tên hợp tác xã") as HTMLInputElement).value).toBe("Tên nháp của tôi");
  });
  it("keeps a conflict draft until the user explicitly adopts a reviewed version", async () => {
    repository.save.mockResolvedValue({ status: "error", code: "MSG06", httpStatus: 409, uncertain: false }); repository.read.mockResolvedValue({ status: "success", data: { ...cooperativeFixture(), rowVersion: "new" } });
    render(<CooperativeApiEditor initial={cooperativeFixture()} />); edit(); await save(); fireEvent.click(await screen.findByRole("button", { name: "Tải dữ liệu mới để đối chiếu" })); await screen.findByText("Hồ sơ hiện tại trên hệ thống");
    expect((screen.getByLabelText("Tên hợp tác xã") as HTMLInputElement).value).toBe("Tên nháp của tôi"); expect(repository.save).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Đã đối chiếu, giữ bản nháp để sửa tiếp" })); await save(); await waitFor(() => expect(repository.save).toHaveBeenCalledTimes(2)); expect(repository.save.mock.calls[1][0].rowVersion).toBe("new");
  });
  it("never replays an ambiguous write after a successful comparison read", async () => {
    repository.save.mockResolvedValue({ status: "error", httpStatus: 401, uncertain: true }); repository.read.mockResolvedValue({ status: "success", data: cooperativeFixture() });
    render(<CooperativeApiEditor initial={cooperativeFixture()} />); edit(); await save(); fireEvent.click(await screen.findByRole("button", { name: "Tải dữ liệu mới để đối chiếu" })); await screen.findByText("Hồ sơ hiện tại trên hệ thống");
    expect(screen.queryByRole("button", { name: "Đã đối chiếu, giữ bản nháp để sửa tiếp" })).toBeNull(); expect((screen.getByRole("button", { name: "Lưu hồ sơ" }) as HTMLButtonElement).disabled).toBe(true); expect(repository.save).toHaveBeenCalledTimes(1);
  });
  it("does not submit twice while confirmation is pending", async () => {
    let finish!: (value: unknown) => void; repository.save.mockImplementation(() => new Promise((resolve) => { finish = resolve; })); render(<CooperativeApiEditor initial={cooperativeFixture()} />); edit();
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" })); const button = within(await screen.findByRole("dialog")).getByRole("button", { name: "Xác nhận lưu" }); fireEvent.click(button); fireEvent.click(button); expect(repository.save).toHaveBeenCalledTimes(1);
    finish({ status: "error", code: "MSG01", httpStatus: 400, uncertain: false }); await screen.findByRole("alert");
  });
  it("asks before discarding a draft and leaves it intact on continue", async () => {
    render(<CooperativeApiEditor initial={cooperativeFixture()} />); edit(); fireEvent.click(screen.getByRole("button", { name: "Hủy thay đổi" })); expect(screen.getByRole("dialog")).toBeTruthy(); fireEvent.click(screen.getByRole("button", { name: "Tiếp tục sửa" })); expect((screen.getByLabelText("Tên hợp tác xã") as HTMLInputElement).value).toBe("Tên nháp của tôi"); expect(repository.save).not.toHaveBeenCalled();
  });
});
