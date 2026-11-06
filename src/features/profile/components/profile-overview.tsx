"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ChangePasswordDialog } from "@/features/account-security/components/change-password-dialog";
import type { AccountSecurityService } from "@/features/account-security/services/account-security-service";
import type { PersonalProfile } from "@/features/profile/domain/personal-profile";
import { ProfileEditor } from "@/features/profile/components/profile-editor";
import type { PersonalProfileService } from "@/features/profile/services/personal-profile-service";
import type { VerificationService } from "@/features/verification/services/verification-service";
import { NotificationPreferencesDialog } from "@/features/notification-preferences/components/notification-preferences-dialog";
import { getNotificationPreferencesService } from "@/features/notification-preferences/services/notification-preferences-service.instance";

export function ProfileOverview({
  onProfileChange,
  profile,
  profileService,
  securityService,
  verificationService,
}: {
  onProfileChange(profile: PersonalProfile): void;
  profile: PersonalProfile;
  profileService: PersonalProfileService;
  securityService: AccountSecurityService;
  verificationService: VerificationService;
}) {
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const initials = profile.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toLocaleUpperCase("vi"))
    .join("");

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 rounded-card border border-primary/15 bg-gradient-to-br from-white to-primary-soft/35 p-5 shadow-card sm:flex-row sm:items-center sm:p-7">
        <span
          aria-hidden="true"
          className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary text-xl font-bold text-white shadow-lg shadow-primary/20"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <h1 className="min-w-0 text-3xl font-semibold tracking-tight text-text [overflow-wrap:anywhere] sm:text-4xl">
            {profile.displayName}
          </h1>
          <p className="mt-2 break-all text-sm font-medium text-text-muted">
            @{profile.username}
            {profile.roles.length > 0 && ` · ${profile.roles.map((role) => role.roleLabel).join(", ")}`}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
            Quản lý thông tin liên hệ, quyền truy cập và bảo mật của tài khoản.
          </p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          aria-labelledby="profile-details-title"
          className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-7"
        >
          <div className="border-b border-border pb-5">
            <h2 className="text-xl font-semibold text-text" id="profile-details-title">Thông tin liên hệ</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Email và số điện thoại mới cần được xác minh trước khi thay thế giá trị hiện tại.
            </p>
          </div>

          <div className="mt-5">
            <ProfileEditor
              onProfileChange={onProfileChange}
              profile={profile}
              profileService={profileService}
              verificationService={verificationService}
            />
          </div>
        </section>

        <aside className="space-y-4" aria-label="Tài khoản và bảo mật">
          <section className="rounded-card border border-border bg-surface p-5 shadow-card">
            <h2 className="text-lg font-semibold text-text">Quyền truy cập</h2>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-sm font-semibold text-text-muted">
                  Tài khoản
                </dt>
                <dd className="mt-1 break-all font-medium text-text">
                  {profile.username}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-text-muted">
                  Vai trò và phạm vi
                </dt>
                <dd className="mt-2 space-y-2">
                  {profile.roles.length === 0 && <p>Không có vai trò theo vùng.</p>}
                  {profile.roles.map((role, index) => (
                    <div
                      className="rounded-control bg-primary-soft px-3 py-2 text-sm text-primary-hover"
                      key={`${role.roleLabel}-${role.zoneId ?? role.scopeLabel ?? "no-scope"}-${index}`}
                    >
                      <p className="font-semibold">{role.roleLabel}</p>
                      {role.scopeLabel && <p className="mt-0.5">{role.scopeLabel}</p>}
                    </div>
                  ))}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-card border border-border bg-surface p-5 shadow-card">
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-hover"><InterfaceIcon name="lock" /></span>
              <div>
                <h2 className="text-lg font-semibold text-text">Mật khẩu & bảo mật</h2>
                <p className="mt-1 text-sm leading-6 text-text-muted">
                  Đổi mật khẩu định kỳ và không sử dụng lại mật khẩu ở dịch vụ khác.
                </p>
              </div>
            </div>
            <Button className="mt-4" onClick={() => setIsPasswordDialogOpen(true)} variant="secondary">
              Đổi mật khẩu
            </Button>
          </section>
          <section className="rounded-card border border-border bg-surface p-5 shadow-card">
            <h2 className="text-lg font-semibold text-text">Thông báo</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">Điều chỉnh kênh nhận thông báo theo nhu cầu của bạn.</p>
            <Button className="mt-4 w-full" variant="secondary" onClick={() => setIsNotificationDialogOpen(true)}>Tùy chọn thông báo</Button>
          </section>
        </aside>
      </div>

      <ChangePasswordDialog
        onOpenChange={setIsPasswordDialogOpen}
        open={isPasswordDialogOpen}
        service={securityService}
      />
      <NotificationPreferencesDialog accountId={profile.accountId} open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}
        service={getNotificationPreferencesService(profile.accountId, profile.email?.isVerified ?? false)} />
    </div>
  );
}
