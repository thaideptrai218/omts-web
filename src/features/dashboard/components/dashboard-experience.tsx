"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { DashboardFarmingSummaryPanel } from "./dashboard-farming-summary";

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
    label: "Nhân viên",
    description: "Tra cứu và cập nhật hồ sơ",
    icon: "users",
    permission: "cooperative.employees.manage",
  },
  {
    href: "/access/accounts",
    label: "Tài khoản nội bộ",
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
    icon: "waves",
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
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text">
            Bảng điều hành
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Theo dõi nhân sự, truy cập và tình hình bè nuôi trong hợp tác xã.
          </p>
        </div>
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
      </header>

      {availableShortcuts.length > 0 && (
        <nav aria-label="Lối tắt quản trị" className="flex flex-wrap gap-2">
          {availableShortcuts.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.description}
              className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:border-primary/50 hover:bg-primary-soft/40"
            >
              <InterfaceIcon
                name={item.icon}
                className="size-4 shrink-0 text-primary"
              />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      )}

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
      <div aria-busy={pending}>
        {view ? (
          <DashboardPanels view={view} />
        ) : pending ? (
          <DashboardDataSkeleton />
        ) : null}
      </div>

      {view?.farming && <DashboardFarmingSummaryPanel summary={view.farming} />}
      <section
        className="flex flex-col gap-4 rounded-card border border-dashed border-border-strong bg-surface p-5 sm:flex-row sm:items-center sm:p-6"
        aria-labelledby="operations-title"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-subtle text-primary">
          <InterfaceIcon name="waves" className="size-6" />
        </span>
        <div>
          <h2 id="operations-title" className="font-semibold text-text">
            Thu chi và vận hành nuôi trồng
          </h2>
          <p className="mt-1 text-sm leading-6 text-text-muted">
            Chưa có số liệu để tổng hợp thu chi và sản lượng thu hoạch.
          </p>
        </div>
      </section>
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
          Tài khoản của bạn chưa có quyền xem bảng điều hành.
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
