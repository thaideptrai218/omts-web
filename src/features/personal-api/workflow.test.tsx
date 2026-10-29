// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
const repository = vi.hoisted(() => ({ profile: vi.fn(), saveProfile: vi.fn(), notifications: vi.fn(), saveNotifications: vi.fn() }));
vi.mock("./repository", () => ({ createPersonalRepository: () => repository }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { NotificationApiEditor } from "./notification-dialog";
import { PersonalApiEditor } from "./profile-screen";
import { notificationFixture, personalFixture, notificationSavedFixture } from "./fixtures";
beforeEach(() => vi.clearAllMocks()); afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const button = (name: string) => screen.getByRole("button", { name });
describe("notification API workflow", () => {
  it("shows the saved notice instead of a second generic success message", async () => {
    const notice = "Thiết lập thông báo đã được lưu. Thiết bị chưa cho phép nhận thông báo.";
    repository.saveNotifications.mockResolvedValue({ status: "success", data: notificationSavedFixture(notificationFixture(), notice) }); render(<NotificationApiEditor initial={notificationFixture()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Công việc · Email" })); fireEvent.click(button("Lưu tùy chọn")); await screen.findByText(notice); expect(screen.queryByText("Đã lưu tùy chọn thông báo.")).toBeNull(); expect(screen.getAllByRole("status")).toHaveLength(1);
  });
  it("shows the actor's Orders category, locks mandatory InApp, all Push and ineligible Zalo with reasons", () => {
    render(<NotificationApiEditor initial={notificationFixture()} onClose={vi.fn()} />);
    for (const name of ["Đơn hàng · Trong ứng dụng", "Đơn hàng · Push", "Công việc · Push", "Công việc · Zalo OA"]) expect((screen.getByRole("checkbox", { name }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("checkbox", { name: "Công việc · Email" }) as HTMLInputElement).disabled).toBe(false);
    expect(screen.getByRole("checkbox", { name: "Công việc · Push" }).getAttribute("aria-describedby")).toBeTruthy();
  });
  it("sends only changed eligible cells and adopts the saved matrix", async () => {
    const next = notificationFixture(); next[1].channels[0].enabled = false; repository.saveNotifications.mockResolvedValue({ status: "success", data: notificationSavedFixture(next) });
    render(<NotificationApiEditor initial={notificationFixture()} onClose={vi.fn()} />); fireEvent.click(screen.getByRole("checkbox", { name: "Công việc · Trong ứng dụng" })); fireEvent.click(button("Lưu tùy chọn"));
    await screen.findByText("Đã lưu tùy chọn thông báo."); expect(repository.saveNotifications).toHaveBeenCalledWith([{ category: "WORK", channel: "InApp", enabled: false }]); expect((button("Lưu tùy chọn") as HTMLButtonElement).disabled).toBe(true);
  });
  it("retains a draft after MSG21, reads current eligibility and requires explicit adoption", async () => {
    repository.saveNotifications.mockResolvedValue({ status: "error", code: "MSG21", httpStatus: 400, uncertain: false }); const next = notificationFixture(); next[1].channels[2] = { channel: "Email", enabled: false, eligible: false, ineligibleReason: "EMAIL_NOT_VERIFIED" }; repository.notifications.mockResolvedValue({ status: "success", data: next });
    render(<NotificationApiEditor initial={notificationFixture()} onClose={vi.fn()} />); fireEvent.click(screen.getByRole("checkbox", { name: "Công việc · Email" })); fireEvent.click(button("Lưu tùy chọn"));
    fireEvent.click(await screen.findByRole("button", { name: "Tải thiết lập hiện tại để đối chiếu" })); await screen.findByText("Thiết lập hiện tại trên hệ thống"); expect((screen.getByRole("checkbox", { name: "Công việc · Email" }) as HTMLInputElement).checked).toBe(true); expect(repository.saveNotifications).toHaveBeenCalledTimes(1);
    fireEvent.click(button("Dùng thiết lập đã lưu")); expect((screen.getByRole("checkbox", { name: "Công việc · Email" }) as HTMLInputElement).checked).toBe(false); expect((screen.getByRole("checkbox", { name: "Công việc · Email" }) as HTMLInputElement).disabled).toBe(true);
  });
  it("does not unlock or replay an uncertain write after a successful GET", async () => {
    repository.saveNotifications.mockResolvedValue({ status: "error", httpStatus: 401, uncertain: true }); repository.notifications.mockResolvedValue({ status: "success", data: notificationFixture() }); render(<NotificationApiEditor initial={notificationFixture()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Công việc · Email" })); fireEvent.click(button("Lưu tùy chọn")); fireEvent.click(await screen.findByRole("button", { name: "Tải thiết lập hiện tại để đối chiếu" })); await screen.findByText("Thiết lập hiện tại trên hệ thống"); expect(screen.queryByRole("button", { name: "Dùng thiết lập đã lưu" })).toBeNull(); expect((button("Lưu tùy chọn") as HTMLButtonElement).disabled).toBe(true); expect(repository.saveNotifications).toHaveBeenCalledTimes(1);
  });
  it("confirms discard on close and preserves draft on continue", () => {
    const close = vi.fn(); render(<NotificationApiEditor initial={notificationFixture()} onClose={close} />); fireEvent.click(screen.getByRole("checkbox", { name: "Công việc · Email" })); fireEvent.click(button("Đóng")); expect(close).not.toHaveBeenCalled(); fireEvent.click(button("Tiếp tục sửa")); expect((screen.getByRole("checkbox", { name: "Công việc · Email" }) as HTMLInputElement).checked).toBe(true); fireEvent.click(button("Đóng")); fireEvent.click(button("Bỏ thay đổi và đóng")); expect(close).toHaveBeenCalledOnce();
  });
  it("blocks double submit and close while a request is pending", async () => {
    let finish!: (value: unknown) => void; repository.saveNotifications.mockImplementation(() => new Promise((resolve) => { finish = resolve; })); const close = vi.fn(); render(<NotificationApiEditor initial={notificationFixture()} onClose={close} />); fireEvent.click(screen.getByRole("checkbox", { name: "Công việc · Email" }));
    const form = button("Lưu tùy chọn").closest("form")!; fireEvent.submit(form); fireEvent.submit(form); fireEvent.click(button("Đóng")); expect(repository.saveNotifications).toHaveBeenCalledOnce(); expect(close).not.toHaveBeenCalled(); finish({ status: "success", data: notificationSavedFixture() }); await screen.findByText("Đã lưu tùy chọn thông báo.");
  });
});
describe("personal API profile workflow", () => {
  it("shows real contact verification, null contact and granted zones without editable username", () => {
    render(<PersonalApiEditor initial={{ ...personalFixture(), grants: [{ role: "Kế toán", zoneId: null, zoneName: null, allZones: true }] }} />); expect(screen.getByText("qa.owner")).toBeTruthy(); expect(screen.getByText("Tất cả vùng")).toBeTruthy(); expect(screen.getByText("Đã xác minh")).toBeTruthy(); expect(screen.getByText("Chưa có thông tin xác minh")).toBeTruthy(); expect(screen.queryByRole("textbox", { name: "Tên đăng nhập" })).toBeNull();
  });
  it("blocks an invalid name and saves only the display name with the current version", async () => {
    repository.saveProfile.mockResolvedValue({ status: "success", data: { ...personalFixture(), displayName: "Tên mới", rowVersion: "new" } }); render(<PersonalApiEditor initial={personalFixture()} />); fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: " " } }); fireEvent.click(button("Lưu thay đổi")); expect(repository.saveProfile).not.toHaveBeenCalled(); expect(screen.getByLabelText("Tên hiển thị").getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: " Tên mới " } }); fireEvent.click(button("Lưu thay đổi")); await screen.findByText("Đã lưu hồ sơ cá nhân."); expect(repository.saveProfile).toHaveBeenCalledWith("Tên mới", "AQID");
  });
  it("keeps a conflict name until explicit reconciliation and never reports a read as a save", async () => {
    repository.saveProfile.mockResolvedValue({ status: "error", code: "MSG06", httpStatus: 409, uncertain: false }); repository.profile.mockResolvedValue({ status: "success", data: { ...personalFixture(), displayName: "Tên trên server", rowVersion: "new" } }); render(<PersonalApiEditor initial={personalFixture()} />); fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "Nháp" } }); fireEvent.click(button("Lưu thay đổi")); fireEvent.click(await screen.findByRole("button", { name: "Tải hồ sơ mới để đối chiếu" })); await screen.findByText("Hồ sơ hiện tại trên hệ thống");
    expect((screen.getByLabelText("Tên hiển thị") as HTMLInputElement).value).toBe("Nháp"); fireEvent.click(button("Đã đối chiếu, giữ tên đang nhập")); expect(screen.queryByText("Đã lưu hồ sơ cá nhân.")).toBeNull(); fireEvent.click(button("Lưu thay đổi")); await waitFor(() => expect(repository.saveProfile).toHaveBeenCalledTimes(2)); expect(repository.saveProfile.mock.calls[1]).toEqual(["Nháp", "new"]);
  });
  it("retains an unsaved name while opening, changing and closing notifications", async () => {
    repository.notifications.mockResolvedValue({ status: "success", data: notificationFixture() }); const next = notificationFixture(); next[1].channels[2].enabled = true; repository.saveNotifications.mockResolvedValue({ status: "success", data: notificationSavedFixture(next) });
    render(<PersonalApiEditor initial={personalFixture()} />); fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "Nháp hồ sơ" } }); fireEvent.click(button("Tùy chọn thông báo")); fireEvent.click(await screen.findByRole("checkbox", { name: "Công việc · Email" })); fireEvent.click(button("Lưu tùy chọn")); await screen.findByText("Đã lưu tùy chọn thông báo."); fireEvent.click(button("Đóng")); expect((screen.getByLabelText("Tên hiển thị") as HTMLInputElement).value).toBe("Nháp hồ sơ"); expect(repository.saveProfile).not.toHaveBeenCalled();
  });
  it("asks before discarding a name draft", () => {
    render(<PersonalApiEditor initial={personalFixture()} />); fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "Nháp" } }); fireEvent.click(button("Hủy thay đổi")); fireEvent.click(button("Tiếp tục sửa")); expect((screen.getByLabelText("Tên hiển thị") as HTMLInputElement).value).toBe("Nháp"); fireEvent.click(button("Hủy thay đổi")); fireEvent.click(button("Bỏ thay đổi")); expect((screen.getByLabelText("Tên hiển thị") as HTMLInputElement).value).toBe(personalFixture().displayName);
  });
  it("does not accept a late save after unmount", async () => {
    let finish!: (value: unknown) => void; repository.saveProfile.mockImplementation(() => new Promise((resolve) => { finish = resolve; })); const view = render(<PersonalApiEditor initial={personalFixture()} />); fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "Nháp" } }); fireEvent.click(button("Lưu thay đổi")); view.unmount(); finish({ status: "success", data: personalFixture() }); await waitFor(() => expect(repository.saveProfile).toHaveBeenCalledOnce()); expect(screen.queryByText("Đã lưu hồ sơ cá nhân.")).toBeNull();
  });
});
