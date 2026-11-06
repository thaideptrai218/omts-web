import { describe, expect, it } from "vitest";
import type { NotificationPreferenceSettings } from "@/features/notification-preferences/domain/notification-preferences";
import { createMockNotificationPreferencesRepository } from "@/features/notification-preferences/repositories/mock-notification-preferences-repository";

const testSettings: NotificationPreferenceSettings = {
  channels: [
    { id: "in-app", label: "Trong ứng dụng" },
    { id: "push", label: "Thông báo đẩy" },
    { id: "email", label: "Email" },
  ],
  items: [
    {
      id: "mandatory-example",
      isMandatory: true,
      label: "Thông báo bắt buộc dùng trong test",
      channels: [
        {
          channelId: "in-app",
          enabled: true,
          isEditable: false,
          reason: { code: "MSG23" },
        },
      ],
    },
    {
      id: "optional-example",
      isMandatory: false,
      label: "Thông báo tùy chọn dùng trong test",
      channels: [
        { channelId: "in-app", enabled: true, isEditable: true },
        {
          channelId: "push",
          enabled: false,
          isEditable: false,
          reason: { code: "MSG22" },
        },
        {
          channelId: "email",
          enabled: false,
          isEditable: false,
          reason: { code: "MSG21", params: { channel_name: "Email" } },
        },
      ],
    },
  ],
};

describe("mock notification preferences repository", () => {
  it("loads an isolated copy of settings", async () => {
    const repository = createMockNotificationPreferencesRepository({
      initialSettings: testSettings,
      latencyMs: 0,
    });

    const result = await repository.load();

    expect(result).toEqual({ settings: testSettings, status: "loaded" });
    expect(result.status === "loaded" && result.settings).not.toBe(testSettings);
  });

  it("saves editable cells", async () => {
    const repository = createMockNotificationPreferencesRepository({
      initialSettings: testSettings,
      latencyMs: 0,
    });

    const result = await repository.save({
      selections: [
        {
          channelId: "in-app",
          enabled: false,
          notificationTypeId: "optional-example",
        },
      ],
    });

    expect(result.status).toBe("saved");
    expect(
      result.status === "saved" && result.settings.items[1].channels[0].enabled,
    ).toBe(false);
  });

  it("keeps a mandatory locked cell enabled", async () => {
    const repository = createMockNotificationPreferencesRepository({
      initialSettings: testSettings,
      latencyMs: 0,
    });

    const result = await repository.save({
      selections: [
        {
          channelId: "in-app",
          enabled: false,
          notificationTypeId: "mandatory-example",
        },
      ],
    });

    expect(result).toEqual({
      message: { code: "MSG23" },
      status: "invalid-preference",
    });
  });

  it("blocks an ineligible email channel with MSG21", async () => {
    const repository = createMockNotificationPreferencesRepository({
      initialSettings: testSettings,
      latencyMs: 0,
    });

    const result = await repository.save({
      selections: [
        {
          channelId: "email",
          enabled: true,
          notificationTypeId: "optional-example",
        },
      ],
    });

    expect(result).toEqual({
      message: { code: "MSG21", params: { channel_name: "Email" } },
      status: "invalid-preference",
    });
  });

  it("saves valid cells while leaving denied push inactive", async () => {
    const repository = createMockNotificationPreferencesRepository({
      initialSettings: testSettings,
      latencyMs: 0,
    });

    const result = await repository.save({
      selections: [
        {
          channelId: "in-app",
          enabled: false,
          notificationTypeId: "optional-example",
        },
        {
          channelId: "push",
          enabled: true,
          notificationTypeId: "optional-example",
        },
      ],
    });

    expect(result.status).toBe("saved");
    expect(result.status === "saved" && result.warning).toEqual({ code: "MSG22" });
    expect(
      result.status === "saved" && result.settings.items[1].channels[0].enabled,
    ).toBe(false);
    expect(
      result.status === "saved" && result.settings.items[1].channels[1].enabled,
    ).toBe(false);
  });

  it("returns MSG19 when the session has expired", async () => {
    const repository = createMockNotificationPreferencesRepository({
      initialSettings: testSettings,
      isSessionActive: () => false,
      latencyMs: 0,
    });

    await expect(repository.load()).resolves.toEqual({
      message: { code: "MSG19" },
      status: "session-expired",
    });
  });
});
