// @vitest-environment jsdom
import { useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { NotificationPreferencesDialog } from "./notification-preferences-dialog";
import { createMockNotificationPreferencesRepository } from "../repositories/mock-notification-preferences-repository";
import { createNotificationPreferencesService } from "../services/notification-preferences-service";
import { notificationPreferencesFixture } from "../mocks/notification-preferences-fixture";
import type { SaveNotificationPreferencesResult } from "../domain/notification-preferences";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("@/components/ui/toast-provider", () => ({
  useToast: () => ({ notify }),
}));
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});
afterAll(() => {
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});
afterEach(() => {
  cleanup();
  notify.mockClear();
  vi.restoreAllMocks();
});

function harness() {
  const service = createNotificationPreferencesService(
    createMockNotificationPreferencesRepository({
      initialSettings: notificationPreferencesFixture("account-owner-demo"),
      latencyMs: 0,
    }),
  );
  const save = vi.spyOn(service, "save");
  function Host() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button onClick={() => setOpen(true)}>Mở cài đặt</button>
        <NotificationPreferencesDialog
          accountId="account-owner-demo"
          open={open}
          onOpenChange={setOpen}
          service={service}
        />
      </>
    );
  }
  render(<Host />);
  return { service, save };
}

describe("notification preference workflow", () => {
  function pendingSave() {
    const settings = notificationPreferencesFixture("account-owner-demo");
    const service = createNotificationPreferencesService(
      createMockNotificationPreferencesRepository({
        initialSettings: settings,
        latencyMs: 0,
      }),
    );
    let finish!: (result: SaveNotificationPreferencesResult) => void;
    const save = vi.spyOn(service, "save").mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const onOpenChange = vi.fn();
    const popup = (open = true) => (
      <NotificationPreferencesDialog
        accountId="account-owner-demo"
        open={open}
        onOpenChange={onOpenChange}
        service={service}
      />
    );
    return {
      settings,
      service,
      save,
      finish: (result: SaveNotificationPreferencesResult) => finish(result),
      onOpenChange,
      popup,
    };
  }

  it("discards the draft when its parent closes it, and shows loading on reopen", async () => {
    const h = pendingSave();
    const view = render(h.popup());
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "Đơn hàng mới · Email" }),
    );
    view.rerender(h.popup(false));
    vi.spyOn(h.service, "load").mockReturnValueOnce(new Promise(() => {}));
    view.rerender(h.popup());
    expect(
      screen.queryByRole("checkbox", { name: "Đơn hàng mới · Email" }),
    ).toBeNull();
    expect(
      screen.getByRole("status", { name: "Đang tải tùy chọn thông báo" }),
    ).toBeTruthy();
  });

  it("does not let a late save close or notify a newly opened dialog", async () => {
    const h = pendingSave();
    const view = render(h.popup());
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "Đơn hàng mới · Email" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Lưu tùy chọn" }));
    await waitFor(() => expect(h.save).toHaveBeenCalledOnce());
    view.rerender(h.popup(false));
    view.rerender(h.popup());
    await act(async () =>
      h.finish({
        status: "saved",
        settings: h.settings,
        message: {
          code: "MSG10",
          params: { object_name: "Tùy chọn thông báo" },
        },
      }),
    );
    expect(h.onOpenChange).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Tùy chọn thông báo" }),
    ).toBeTruthy();
  });

  it("does not publish session expiry from an obsolete save after unmount", async () => {
    const h = pendingSave();
    const publish = vi.spyOn(sessionExpiryChannel, "publish");
    const view = render(h.popup());
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "Đơn hàng mới · Email" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Lưu tùy chọn" }));
    await waitFor(() => expect(h.save).toHaveBeenCalledOnce());
    view.unmount();
    await act(async () =>
      h.finish({ status: "session-expired", message: { code: "MSG19" } }),
    );
    expect(publish).not.toHaveBeenCalled();
  });

  it("keeps the pending dialog open on Escape, then closes on a current success", async () => {
    const h = pendingSave();
    const pendingImplementation = h.save.getMockImplementation()!;
    h.save.mockImplementation((input) => {
      fireEvent(
        screen.getByRole("dialog", { name: "Tùy chọn thông báo" }),
        new Event("cancel", { bubbles: true, cancelable: true }),
      );
      return pendingImplementation(input);
    });
    render(h.popup());
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "Đơn hàng mới · Email" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Lưu tùy chọn" }));
    await waitFor(() => expect(h.save).toHaveBeenCalledOnce());
    fireEvent(
      screen.getByRole("dialog", { name: "Tùy chọn thông báo" }),
      new Event("cancel", { bubbles: true, cancelable: true }),
    );
    expect(h.onOpenChange).not.toHaveBeenCalled();
    await act(async () =>
      h.finish({
        status: "saved",
        settings: h.settings,
        message: {
          code: "MSG10",
          params: { object_name: "Tùy chọn thông báo" },
        },
      }),
    );
    expect(h.onOpenChange).toHaveBeenCalledWith(false);
    expect(notify).toHaveBeenCalledOnce();
  });

  it("shows loading instead of account A's settings after switching to B", async () => {
    const h = pendingSave();
    const view = render(h.popup());
    await screen.findByRole("checkbox", { name: "Đơn hàng mới · Email" });
    const other = createNotificationPreferencesService(
      createMockNotificationPreferencesRepository({
        initialSettings: notificationPreferencesFixture(
          "account-staff-verified",
        ),
        latencyMs: 0,
      }),
    );
    vi.spyOn(other, "load").mockReturnValueOnce(new Promise(() => {}));
    view.rerender(
      <NotificationPreferencesDialog
        accountId="account-staff-verified"
        open
        onOpenChange={h.onOpenChange}
        service={other}
      />,
    );
    expect(
      screen.queryByRole("checkbox", { name: "Đơn hàng mới · Email" }),
    ).toBeNull();
    expect(
      screen.getByRole("status", { name: "Đang tải tùy chọn thông báo" }),
    ).toBeTruthy();
  });

  it("recovers from a failed load through the retry control", async () => {
    const h = pendingSave();
    vi.spyOn(h.service, "load").mockRejectedValueOnce(
      new Error("Fixture unavailable"),
    );
    render(h.popup());
    fireEvent.click(await screen.findByRole("button", { name: "Thử tải lại" }));
    await screen.findByRole("checkbox", { name: "Đơn hàng mới · Email" });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps the draft after a failed save and allows a successful retry", async () => {
    const h = pendingSave();
    h.save.mockRejectedValueOnce(new Error("Fixture unavailable"));
    render(h.popup());
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "Đơn hàng mới · Email" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Lưu tùy chọn" }));
    await screen.findByRole("alert");
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Đơn hàng mới · Email",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(h.onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Lưu tùy chọn" }));
    await waitFor(() => expect(h.save).toHaveBeenCalledTimes(2));
    await act(async () =>
      h.finish({
        status: "saved",
        settings: h.settings,
        message: {
          code: "MSG10",
          params: { object_name: "Tùy chọn thông báo" },
        },
      }),
    );
    expect(notify).toHaveBeenCalledOnce();
    expect(h.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("still publishes session expiry from a current save", async () => {
    const h = pendingSave();
    const publish = vi.spyOn(sessionExpiryChannel, "publish");
    render(h.popup());
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "Đơn hàng mới · Email" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Lưu tùy chọn" }));
    await waitFor(() => expect(h.save).toHaveBeenCalledOnce());
    await act(async () =>
      h.finish({ status: "session-expired", message: { code: "MSG19" } }),
    );
    expect(publish).toHaveBeenCalledWith({ code: "MSG19" });
  });

  it("locks email before verification and unlocks it later without resetting other preferences", async () => {
    let verified = false;
    const repository = createMockNotificationPreferencesRepository({
      initialSettings: notificationPreferencesFixture("account-owner-demo"),
      latencyMs: 0,
      isEmailVerified: () => verified,
    });
    const before = await repository.load();
    expect(before).toMatchObject({
      settings: {
        items: expect.arrayContaining([
          expect.objectContaining({
            id: "work",
            channels: expect.arrayContaining([
              expect.objectContaining({
                channelId: "email",
                isEditable: false,
              }),
            ]),
          }),
        ]),
      },
    });
    await repository.save({
      selections: [
        { notificationTypeId: "work", channelId: "in-app", enabled: false },
      ],
    });
    verified = true;
    const after = await repository.load();
    if (after.status !== "loaded") throw new Error("Expected settings");
    const work = after.settings.items.find((item) => item.id === "work")!;
    expect(
      work.channels.find((cell) => cell.channelId === "email")?.isEditable,
    ).toBe(true);
    expect(
      work.channels.find((cell) => cell.channelId === "in-app")?.enabled,
    ).toBe(false);
  });
  it("keeps mandatory channels locked with an explanation, and saves only editable selections", async () => {
    const h = harness();
    const locked = await screen.findByRole("checkbox", {
      name: "Đơn hàng mới · Trong ứng dụng",
    });
    expect((locked as HTMLInputElement).disabled).toBe(true);
    expect(locked.getAttribute("aria-describedby")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Đơn hàng mới · Email" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Lưu tùy chọn" }));
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        expect.objectContaining({ tone: "success" }),
      ),
    );
    expect(h.save).toHaveBeenCalledOnce();
    expect(
      h.save.mock.calls[0][0].selections.some(
        (cell) => cell.channelId === "push" || cell.channelId === "zalo",
      ),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Mở cài đặt" }));
    const saved = await screen.findByRole("checkbox", {
      name: "Đơn hàng mới · Email",
    });
    expect((saved as HTMLInputElement).checked).toBe(true);
  });
  it("discards an unsaved draft when closing and reloads the saved state on reopen", async () => {
    const h = harness();
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "Đơn hàng mới · Email" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^Đóng$/ }));
    expect(h.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Mở cài đặt" }));
    expect(
      (
        (await screen.findByRole("checkbox", {
          name: "Đơn hàng mới · Email",
        })) as HTMLInputElement
      ).checked,
    ).toBe(false);
  });
});
