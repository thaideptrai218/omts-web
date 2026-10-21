"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProfileOverview } from "@/features/profile/components/profile-overview";
import { ProfilePageSkeleton } from "@/features/profile/components/profile-page-skeleton";
import type { PersonalProfile } from "@/features/profile/domain/personal-profile";
import { useAuth } from "@/features/auth/state/auth-provider";
import { getPersonalProfileEnvironment } from "@/features/profile/services/personal-profile-service.instance";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";
import { getAccountSecurityService } from "@/features/account-security/services/account-security-service.instance";

export function ProfileExperience() {
  const { state } = useAuth();
  const [profile, setProfile] = useState<PersonalProfile>();
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const environment =
    state.status === "authenticated"
      ? getPersonalProfileEnvironment(state.account.accountId)
      : null;
  const personalProfileService = environment?.profileService;
  const accountSecurityService =
    state.status === "authenticated"
      ? getAccountSecurityService(state.account.accountId)
      : null;

  async function loadProfile() {
    if (!personalProfileService) {
      setHasLoadError(true);
      setIsLoading(false);
      return;
    }
    setHasLoadError(false);
    setIsLoading(true);

    try {
      const result = await personalProfileService.load();
      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
        return;
      }

      setProfile(result.profile);
    } catch {
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    if (!personalProfileService) return;

    personalProfileService
      .load()
      .then((result) => {
        if (!isActive) return;
        if (result.status === "session-expired") {
          sessionExpiryChannel.publish(result.message);
          return;
        }

        setProfile(result.profile);
      })
      .catch(() => {
        if (isActive) setHasLoadError(true);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [personalProfileService]);

  if (!environment || !personalProfileService || !accountSecurityService) {
    return (
      <section className="mx-auto mt-10 max-w-md rounded-card border border-border bg-surface p-6 text-center shadow-card">
        <h1 className="text-2xl font-semibold text-text">Chưa có hồ sơ phù hợp</h1>
        <p className="mt-3 leading-7 text-text-muted">
          Tài khoản hiện tại chưa được liên kết với hồ sơ cá nhân. Vui lòng liên hệ quản trị viên hệ thống.
        </p>
      </section>
    );
  }

  if (isLoading) return <ProfilePageSkeleton />;

  if (hasLoadError || !profile) {
    return (
      <section className="mx-auto mt-10 max-w-md rounded-card border border-border bg-surface p-6 text-center shadow-card">
        <h1 className="text-2xl font-semibold text-text">Chưa tải được hồ sơ</h1>
        <p className="mt-3 leading-7 text-text-muted">
          Kết nối có thể đang gián đoạn. Bạn có thể thử tải lại mà không cần đăng nhập lại.
        </p>
        <Button className="mt-6" onClick={() => void loadProfile()}>
          Tải lại
        </Button>
      </section>
    );
  }

  return (
    <ProfileOverview
      onProfileChange={setProfile}
      profile={profile}
      profileService={personalProfileService}
      securityService={accountSecurityService}
      verificationService={environment.verificationService}
    />
  );
}
