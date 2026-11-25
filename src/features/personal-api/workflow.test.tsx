// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
const repository = vi.hoisted(() => ({ profile: vi.fn(), saveProfile: vi.fn() }));
vi.mock("./repository", () => ({ createPersonalRepository: () => repository }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { PersonalApiEditor } from "./profile-screen";
import { personalFixture } from "./fixtures";
beforeEach(() => vi.clearAllMocks()); afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const button = (name: string) => screen.getByRole("button", { name });
describe("personal API profile workflow", () => {
  it("shows real contact verification, null contact and granted zones without editable username", () => {
    render(<PersonalApiEditor initial={{ ...personalFixture(), grants: [{ role: "Kế toán", zoneId: null, zoneName: null, allZones: true }] }} />); expect(screen.getByText("qa.owner")).toBeTruthy(); expect(screen.getByText("Tất cả vùng")).toBeTruthy(); expect(screen.getByText("Đã xác minh")).toBeTruthy(); expect(screen.getByText("Chưa có thông tin xác minh")).toBeTruthy(); expect(screen.queryByRole("textbox", { name: "Tên đăng nhập" })).toBeNull();
  });
  it("blocks an invalid name and saves only the display name with the current version", async () => {
    repository.saveProfile.mockResolvedValue({ status: "success", data: { ...personalFixture(), displayName: "Tên mới", rowVersion: "new" } }); render(<PersonalApiEditor initial={personalFixture()} />); fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: " " } }); fireEvent.click(button("Lưu thay đổi")); expect(repository.saveProfile).not.toHaveBeenCalled(); expect(screen.getByLabelText("Tên hiển thị").getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: " Tên mới " } }); fireEvent.click(button("Lưu thay đổi")); await screen.findByText("Đã lưu tên hiển thị."); expect(repository.saveProfile).toHaveBeenCalledWith("Tên mới", "AQID");
  });
  it("keeps a conflict name until explicit reconciliation and never reports a read as a save", async () => {
    repository.saveProfile.mockResolvedValue({ status: "error", code: "MSG06", httpStatus: 409, uncertain: false }); repository.profile.mockResolvedValue({ status: "success", data: { ...personalFixture(), displayName: "Tên trên server", rowVersion: "new" } }); render(<PersonalApiEditor initial={personalFixture()} />); fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "Nháp" } }); fireEvent.click(button("Lưu thay đổi")); fireEvent.click(await screen.findByRole("button", { name: "Tải hồ sơ mới để đối chiếu" })); await screen.findByText("Hồ sơ hiện tại trên hệ thống");
    expect((screen.getByLabelText("Tên hiển thị") as HTMLInputElement).value).toBe("Nháp"); fireEvent.click(button("Đã đối chiếu, giữ tên đang nhập")); expect(screen.queryByText("Đã lưu tên hiển thị.")).toBeNull(); fireEvent.click(button("Lưu thay đổi")); await waitFor(() => expect(repository.saveProfile).toHaveBeenCalledTimes(2)); expect(repository.saveProfile.mock.calls[1]).toEqual(["Nháp", "new"]);
  });
  it("asks before discarding a name draft", () => {
    render(<PersonalApiEditor initial={personalFixture()} />); fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "Nháp" } }); fireEvent.click(button("Hủy thay đổi")); fireEvent.click(button("Tiếp tục sửa")); expect((screen.getByLabelText("Tên hiển thị") as HTMLInputElement).value).toBe("Nháp"); fireEvent.click(button("Hủy thay đổi")); fireEvent.click(button("Bỏ thay đổi")); expect((screen.getByLabelText("Tên hiển thị") as HTMLInputElement).value).toBe(personalFixture().displayName);
  });
  it("does not accept a late save after unmount", async () => {
    let finish!: (value: unknown) => void; repository.saveProfile.mockImplementation(() => new Promise((resolve) => { finish = resolve; })); const view = render(<PersonalApiEditor initial={personalFixture()} />); fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "Nháp" } }); fireEvent.click(button("Lưu thay đổi")); view.unmount(); finish({ status: "success", data: personalFixture() }); await waitFor(() => expect(repository.saveProfile).toHaveBeenCalledOnce()); expect(screen.queryByText("Đã lưu tên hiển thị.")).toBeNull();
  });
});
