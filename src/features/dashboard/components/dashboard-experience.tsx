"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ManagementHeading } from "@/components/ui/management-page";
import {
  InterfaceIcon,
  type InterfaceIconName,
} from "@/components/ui/interface-icon";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";
import type { EffectivePermissionKey } from "@/features/access/domain/access-types";
import type { AuthAccount } from "@/features/auth/domain/auth-types";
import { useAuth } from "@/features/auth/state/auth-provider";
import { dashboardService } from "../services/dashboard-service.instance";
import type { DashboardView } from "../domain/dashboard";
import { DashboardDataSkeleton, DashboardPanels } from "./dashboard-panels";
import styles from "./dashboard-layout.module.css";
import { DashboardFarmingSummaryPanel } from "./dashboard-farming-summary";
import { DashboardShortcuts } from "./dashboard-shortcuts";

const shortcuts: readonly {
  href: string;
  label: string;
  description: string;
  icon: InterfaceIconName;
  permission: EffectivePermissionKey;
}[] = [
  {
    href: "/farming/rafts",
    label: "Bè nuôi",
    description: "Tra cứu và xem sơ đồ làn",
    icon: "raft",
    permission: "farming.rafts.view",
  },
  {
    href: "/employees",
    label: "Nhân viên ngoài giờ",
    description: "Tra cứu và cập nhật hồ sơ",
    icon: "employee",
    permission: "cooperative.employees.manage",
  },
  {
    href: "/access/accounts",
    label: "Tài khoản nhân viên nội bộ",
    description: "Quản lý đăng nhập và vùng",
    icon: "account",
    permission: "access.accounts.manage",
  },
  {
    href: "/access/roles",
    label: "Vai trò & quyền",
    description: "Kiểm tra quyền theo chức năng",
    icon: "roles",
    permission: "access.roles.manage",
  },
  {
    href: "/cooperative/profile",
    label: "Hồ sơ hợp tác xã",
    description: "Thông tin và liên hệ chung",
    icon: "cooperative",
    permission: "cooperative.profile.manage",
  },
];

function DashboardWorkspace({ account }: { account: AuthAccount }) {
  const [view, setView] = useState<DashboardView>();
  const [pending, setPending] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reload, setReload] = useState(0);
  const availableShortcuts = shortcuts.filter((item) =>
    hasEffectivePermission(account.access, item.permission),
  );
  const waitingForFarming =
    pending &&
    !view &&
    hasEffectivePermission(account.access, "cooperative.profile.manage") &&
    hasEffectivePermission(account.access, "farming.rafts.view");
  const hasFarmingPanel = !!view?.farming || waitingForFarming;

  useEffect(() => {
    let active = true;
    dashboardService
      .load(account.access)
      .then((result) => {
        if (active) {
          setView(result);
          setHasError(false);
        }
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, [account.access, reload]);

  function refresh() {
    setPending(true);
    setHasError(false);
    setReload((value) => value + 1);
  }

  return (
    <div className="space-y-5">
      <ManagementHeading title="Tổng quan HTX" description="Tình hình vùng nuôi và công việc cần theo dõi trong phạm vi được cấp." icon="dashboard">
        <Button
          variant="secondary"
          className="sm:w-auto"
          disabled={pending}
          onClick={refresh}
        >
          <InterfaceIcon
            name="refresh"
            className={`size-4 ${pending ? "motion-safe:animate-spin" : ""}`}
          />
          <span>{pending ? "Đang tải số liệu" : "Làm mới số liệu"}</span>
        </Button>
      </ManagementHeading>

      {hasError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-card border border-danger/20 bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 className="font-semibold text-danger">
              Chưa tải được số liệu mới
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              {view
                ? "Số liệu bên dưới chưa được làm mới. Bạn có thể thử lại."
                : "Các lối tắt vẫn sử dụng được. Vui lòng thử tải lại số liệu."}
            </p>
          </div>
          <Button
            variant="secondary"
            className="sm:w-auto"
            disabled={pending}
            onClick={refresh}
          >
            Thử lại
          </Button>
        </div>
      )}
      <div
        className={
          hasFarmingPanel && availableShortcuts.length
            ? styles.overview
            : "space-y-5"
        }
      >
        {view?.farming ? (
          <div aria-busy={pending} className={styles.farming}>
            <DashboardFarmingSummaryPanel summary={view.farming} />
          </div>
        ) : waitingForFarming ? (
          <div
            aria-label="Đang tải tình hình bè nuôi"
            aria-busy="true"
            className={`${styles.farming} min-h-60 rounded-card border border-border bg-[#f6f8f3] motion-safe:animate-pulse`}
          />
        ) : null}
      <div aria-busy={pending} className={styles.panels}>
        {view ? (
          <DashboardPanels view={view} />
        ) : pending ? (
          <DashboardDataSkeleton />
        ) : null}
      </div>
        {availableShortcuts.length > 0 && (
          <div className={styles.shortcuts}><DashboardShortcuts items={availableShortcuts} /></div>
        )}
      </div>
    </div>
  );
}

export function DashboardExperience() {
  const { state } = useAuth();
  if (state.status === "loading") return <DashboardDataSkeleton />;
  if (state.status === "anonymous")
    return (
      <section className="rounded-card border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold">Cần đăng nhập</h1>
        <Link
          href="/login"
          className="mt-3 inline-block text-primary underline"
        >
          Đăng nhập để tiếp tục
        </Link>
      </section>
    );
  if (!hasEffectivePermission(state.account.access, "workspace.overview.view"))
    return (
      <section className="rounded-card border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold">Chưa được cấp quyền</h1>
        <p className="mt-2 text-text-muted">
          Tài khoản của bạn chưa được cấp quyền xem thông tin tổng quan.
        </p>
      </section>
    );
  // Remount data state when identity or effective scope changes. No cross-account cache.
  return (
    <DashboardWorkspace
      key={`${state.account.accountId}:${JSON.stringify(state.account.access)}`}
      account={state.account}
    />
  );
}
