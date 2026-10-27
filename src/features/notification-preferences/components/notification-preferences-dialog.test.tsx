// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NotificationPreferencesDialog } from "./notification-preferences-dialog";
import { createMockNotificationPreferencesRepository } from "../repositories/mock-notification-preferences-repository";
import { createNotificationPreferencesService } from "../services/notification-preferences-service";
import { notificationPreferencesFixture } from "../mocks/notification-preferences-fixture";

const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify }) }));
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
afterEach(() => { cleanup(); notify.mockClear(); });

function harness() {
  const service = createNotificationPreferencesService(createMockNotificationPreferencesRepository({
    initialSettings: notificationPreferencesFixture("account-owner-demo"), latencyMs: 0,
  }));
  const save = vi.spyOn(service, "save");
  function Host() {
    const [open, setOpen] = useState(true);
    return <><button onClick={() => setOpen(true)}>Mở cài đặt</button><NotificationPreferencesDialog open={open} onOpenChange={setOpen} service={service} /></>;
  }
  render(<Host />);
  return { service, save };
}

describe("notification preference workflow", () => {
  it("locks email before verification and unlocks it later without resetting other preferences", async () => {
    let verified = false;
    const repository = createMockNotificationPreferencesRepository({ initialSettings: notificationPreferencesFixture("account-owner-demo"),
      latencyMs: 0, isEmailVerified: () => verified });
    const before = await repository.load();
    expect(before).toMatchObject({ settings: { items: expect.arrayContaining([expect.objectContaining({ id: "work",
      channels: expect.arrayContaining([expect.objectContaining({ channelId: "email", isEditable: false })]) })]) } });
    await repository.save({ selections: [{ notificationTypeId: "work", channelId: "in-app", enabled: false }] });
    verified = true;
    const after = await repository.load();
    if (after.status !== "loaded") throw new Error("Expected settings");
    const work = after.settings.items.find((item) => item.id === "work")!;
    expect(work.channels.find((cell) => cell.channelId === "email")?.isEditable).toBe(true);
    expect(work.channels.find((cell) => cell.channelId === "in-app")?.enabled).toBe(false);
  });
  it("keeps mandatory channels locked with an explanation, and saves only editable selections", async () => {
    const h = harness();
    const locked = await screen.findByRole("checkbox", { name: "Đơn hàng mới · Trong ứng dụng" });
    expect((locked as HTMLInputElement).disabled).toBe(true);
    expect(locked.getAttribute("aria-describedby")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Đơn hàng mới · Email" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu tùy chọn" }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" })));
    expect(h.save).toHaveBeenCalledOnce();
    expect(h.save.mock.calls[0][0].selections.some((cell) => cell.channelId === "push" || cell.channelId === "zalo")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Mở cài đặt" }));
    const saved = await screen.findByRole("checkbox", { name: "Đơn hàng mới · Email" });
    expect((saved as HTMLInputElement).checked).toBe(true);
  });
  it("discards an unsaved draft when closing and reloads the saved state on reopen", async () => {
    const h = harness();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Đơn hàng mới · Email" }));
    fireEvent.click(screen.getByRole("button", { name: /^Đóng$/ }));
    expect(h.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Mở cài đặt" }));
    expect((await screen.findByRole("checkbox", { name: "Đơn hàng mới · Email" }) as HTMLInputElement).checked).toBe(false);
  });
});
