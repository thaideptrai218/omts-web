// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
const api = vi.hoisted(() => ({ profile: vi.fn(), notifications: vi.fn(), saveProfile: vi.fn(), savePush: vi.fn() }));
vi.mock("./repository", () => ({ createPersonalRepository: () => api }));
import { PersonalApiScreen } from "./profile-screen";
import { personalFixture } from "./fixtures";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("keeps the profile draft while viewing inline notification preferences", async () => {
  api.profile.mockResolvedValue({ status: "success", data: personalFixture() });
  api.notifications.mockResolvedValue({ status: "success", data: { types: [{ type: "WATER_ALERT", name: "Water alert", mandatory: true, push: true }], pushAllowedOnDevice: false } });
  render(<PersonalApiScreen />);
  fireEvent.change(await screen.findByLabelText("Tên hiển thị"), { target: { value: "Tên đang sửa" } });
  fireEvent.click(screen.getByRole("button", { name: "Thông báo" }));
  await screen.findByRole("checkbox", { name: "Cảnh báo nước" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect((screen.getByRole("checkbox", { name: "Cảnh báo nước" }) as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Hồ sơ" }));
  expect((screen.getByLabelText("Tên hiển thị") as HTMLInputElement).value).toBe("Tên đang sửa");
  expect(api.saveProfile).not.toHaveBeenCalled(); expect(api.savePush).not.toHaveBeenCalled();
});
