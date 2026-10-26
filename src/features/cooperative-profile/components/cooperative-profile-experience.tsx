"use client";

import { useEffect, useState } from "react";
import { RestrictedAccessIcon } from "@/components/feedback/restricted-access-icon";
import { Button } from "@/components/ui/button";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";
import { useAuth } from "@/features/auth/state/auth-provider";
import { CooperativeProfileEditor } from "@/features/cooperative-profile/components/cooperative-profile-editor";
import { CooperativeProfilePageSkeleton } from "@/features/cooperative-profile/components/cooperative-profile-page-skeleton";
import type { BankOption, CooperativeProfile } from "@/features/cooperative-profile/domain/cooperative-profile";
import { cooperativeProfileService } from "@/features/cooperative-profile/services/cooperative-profile-service.instance";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

type LoadedProfile = Readonly<{
  banks: readonly BankOption[];
  profile: CooperativeProfile;
}>;

function PermissionDenied() {
  return (
    <section className="mx-auto mt-10 max-w-lg rounded-card border border-border bg-surface p-6 text-center shadow-card sm:p-8">
      <div aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-full bg-warning-soft">
        <RestrictedAccessIcon />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-text">
        Không có quyền quản lý hồ sơ HTX
      </h1>
      <p className="mt-3 leading-7 text-text-muted">{formatMessage({ code: "MSG02" })}</p>
    </section>
  );
}

export function CooperativeProfileExperience() {
  const { state } = useAuth();
  const [data, setData] = useState<LoadedProfile>();
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const canManage =
    state.status === "authenticated" &&
    hasEffectivePermission(state.account.access, "cooperative.profile.manage");

  async function loadProfile() {
    if (!canManage) return;

    setHasLoadError(false);
    setIsLoading(true);

    try {
      const result = await cooperativeProfileService.load();
      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
        return;
      }
      if (result.status === "forbidden") {
        setHasLoadError(true);
        return;
      }

      setData({ banks: result.banks, profile: result.profile });
    } catch {
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    if (!canManage) {
      return () => {
        isActive = false;
      };
    }

    cooperativeProfileService
      .load()
      .then((result) => {
        if (!isActive) return;
        if (result.status === "session-expired") {
          sessionExpiryChannel.publish(result.message);
          return;
        }
        if (result.status === "forbidden") {
          setHasLoadError(true);
          return;
        }

        setData({ banks: result.banks, profile: result.profile });
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
  }, [canManage]);

  if (state.status !== "authenticated") return null;
  if (!canManage) return <PermissionDenied />;
  if (isLoading) return <CooperativeProfilePageSkeleton />;

  if (hasLoadError || !data) {
    return (
      <section className="mx-auto mt-10 max-w-md rounded-card border border-border bg-surface p-6 text-center shadow-card">
        <h1 className="text-2xl font-semibold text-text">Chưa tải được hồ sơ HTX</h1>
        <p className="mt-3 leading-7 text-text-muted">
          Kết nối có thể đang gián đoạn. Dữ liệu chưa bị thay đổi.
        </p>
        <Button className="mt-6" onClick={() => void loadProfile()}>
          Tải lại
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Thiết lập hợp tác xã</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            Hồ sơ hợp tác xã
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-text-muted">
            Hoàn thiện thông tin pháp lý, liên hệ và tài khoản nhận chuyển khoản của HTX.
          </p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-sm font-semibold ${
          data.profile.status === "completed"
            ? "bg-emerald-50 text-success"
            : "bg-warning-soft text-warning"
        }`}>
          {data.profile.status === "completed" ? "Đã hoàn thiện" : "Chưa hoàn thiện"}
        </span>
      </header>

      <CooperativeProfileEditor
        banks={data.banks}
        key={data.profile.recordVersion}
        onProfileChange={(profile) => setData((current) => current && ({ ...current, profile }))}
        onReload={() => void loadProfile()}
        profile={data.profile}
      />
    </div>
  );
}
