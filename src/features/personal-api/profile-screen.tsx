"use client";
import { ApiSecurityGate } from "@/features/auth/components/api-security-gate";
import styles from "./profile-layout.module.css";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { createPersonalRepository } from "./repository";
import { NotificationApiDialog } from "./notification-dialog";
import { PersonalApiEditor } from "./profile-editor";
import { DevicesPanel } from "@/features/device-sessions-api/devices-panel";

// The editor lives in its own module; keep exporting it from here for existing importers.
export { PersonalApiEditor };

type AccountTab = "profile" | "security" | "devices" | "notifications";

const tabClass =
  "border-b-2 border-transparent py-3 font-medium text-text-muted aria-[current=page]:border-primary aria-[current=page]:text-primary";

/**
 * "Tài khoản của tôi" with profile, password and notification tabs. The security and notification
 * panels mount on first visit and then stay mounted (hidden) so their drafts survive tab switches.
 */
export function PersonalApiScreen({ initialTab = "profile" }: { initialTab?: AccountTab } = {}) {
  const load = useCallback((signal: AbortSignal) => createPersonalRepository().profile(signal), []);
  const remote = useRemote(load);
  const [tab, setTab] = useState<AccountTab>(initialTab);
  const [preferencesVisited, setPreferencesVisited] = useState(initialTab === "notifications");
  const [securityVisited, setSecurityVisited] = useState(initialTab === "security");
  const [devicesVisited, setDevicesVisited] = useState(initialTab === "devices");

  function showPreferences() {
    setPreferencesVisited(true);
    setTab("notifications");
  }
  function showSecurity() {
    setSecurityVisited(true);
    setTab("security");
  }
  function showDevices() {
    setDevicesVisited(true);
    setTab("devices");
  }

  return (
    <section className={styles.page}>
      <header className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-accent">Tài khoản</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tài khoản của tôi</h1>
        <p className="mt-2 text-sm text-text-muted">Thông tin, liên hệ và quyền truy cập của bạn.</p>
      </header>
      <nav aria-label="Thiết lập tài khoản" className="mb-6 flex gap-6 border-b border-border text-sm">
        <button
          type="button"
          aria-current={tab === "profile" ? "page" : undefined}
          onClick={() => setTab("profile")}
          className={tabClass}
        >
          Hồ sơ
        </button>
        <button
          type="button"
          aria-current={tab === "security" ? "page" : undefined}
          onClick={showSecurity}
          className={tabClass}
        >
          Đổi mật khẩu
        </button>
        <button
          type="button"
          aria-current={tab === "devices" ? "page" : undefined}
          onClick={showDevices}
          className={tabClass}
        >
          Thiết bị đăng nhập
        </button>
        <button
          type="button"
          aria-current={tab === "notifications" ? "page" : undefined}
          onClick={showPreferences}
          className={tabClass}
        >
          Thông báo
        </button>
      </nav>
      <div hidden={tab !== "profile"}>
        {remote.loading && <Skeleton />}
        <ErrorNotice error={remote.error} />
        {!remote.loading && !remote.data && (
          <Button className="mt-4 w-auto" onClick={remote.reload}>
            Tải lại hồ sơ
          </Button>
        )}
        {remote.data && (
          <PersonalApiEditor
            initial={remote.data}
            onShowNotifications={showPreferences}
            onShowSecurity={showSecurity}
          />
        )}
      </div>
      {securityVisited && (
        <div hidden={tab !== "security"} className="mx-auto w-full max-w-2xl">
          <ApiSecurityGate phase="password-change-required" forced={false} />
        </div>
      )}
      {devicesVisited && (
        <div hidden={tab !== "devices"} className="mx-auto w-full max-w-2xl">
          <DevicesPanel />
        </div>
      )}
      {preferencesVisited && (
        <div hidden={tab !== "notifications"}>
          <NotificationApiDialog inline onClose={() => setTab("profile")} />
        </div>
      )}
    </section>
  );
}
