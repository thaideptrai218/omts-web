"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import type {
  EffectiveAccess,
  EffectivePermissionKey,
} from "@/features/access/domain/access-types";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";

type AppShellProps = {
  access?: EffectiveAccess;
  accountInitials?: string;
  accountLabel?: string;
  children: ReactNode;
  isLoggingOut?: boolean;
  onLogout: () => void;
};

const navigationItems = [
  {
    href: "/dashboard",
    label: "Tổng quan",
    requiredPermission: "workspace.overview.view",
  },
  {
    href: "/account",
    label: "Tài khoản",
  },
  {
    href: "/cooperative/profile",
    label: "Hồ sơ HTX",
    requiredPermission: "cooperative.profile.manage",
  },
  {
    href: "/employees",
    label: "Nhân viên",
    requiredPermission: "cooperative.employees.manage",
  },
  {
    href: "/access/accounts",
    label: "Tài khoản nội bộ",
    requiredPermission: "access.accounts.manage",
  },
  {
    href: "/access/roles",
    label: "Vai trò và quyền",
    requiredPermission: "access.roles.manage",
  },
  {
    href: "/system/cooperatives/new",
    label: "Khởi tạo HTX",
    requiredPermission: "platform.cooperative.provision",
  },
] as const satisfies readonly {
  href: string;
  label: string;
  requiredPermission?: EffectivePermissionKey;
}[];

function MenuIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M3 5h14M3 10h14M3 15h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M3.5 9 10 3.75 16.5 9v7.25h-4v-4.5h-5v4.5h-4V9Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.5 16c.7-2.7 2.55-4 5.5-4s4.8 1.3 5.5 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function CooperativeIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M3.5 16.25h13M5 16.25V7.5l5-3.75 5 3.75v8.75M7.5 9.5h5M7.5 12.25h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function AccessIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M10 2.75 16 5v4.5c0 3.65-2.2 6.2-6 7.75-3.8-1.55-6-4.1-6-7.75V5l6-2.25Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path d="m7.5 10 1.55 1.55L12.75 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M8 4H4.75A1.75 1.75 0 0 0 3 5.75v8.5C3 15.22 3.78 16 4.75 16H8m3-3.25L13.75 10 11 7.25M6.5 10h7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function LogoutButton({
  collapsed = false,
  isPending = false,
  onClick,
}: {
  collapsed?: boolean;
  isPending?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-busy={isPending || undefined}
      aria-label={collapsed ? "Đăng xuất" : undefined}
      className="flex min-h-11 w-full items-center justify-center gap-3 rounded-control border border-border px-3 py-2.5 text-sm font-semibold text-text-muted transition duration-200 hover:border-danger/40 hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isPending}
      onClick={onClick}
      title={collapsed ? "Đăng xuất" : undefined}
      type="button"
    >
      {isPending ? (
        <span
          aria-hidden="true"
          className="size-5 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
        />
      ) : (
        <LogoutIcon />
      )}
      <span className={collapsed ? "sr-only" : undefined}>
        {isPending ? "Đang đăng xuất..." : "Đăng xuất"}
      </span>
    </button>
  );
}

function NavigationList({
  access,
  collapsed = false,
  onNavigate,
}: {
  access?: EffectiveAccess;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const visibleItems = navigationItems.filter((item) =>
    !("requiredPermission" in item) ||
    hasEffectivePermission(access, item.requiredPermission),
  );

  if (visibleItems.length === 0) {
    return (
      <p className="px-3 text-sm leading-6 text-text-muted">
        Chưa có mục phù hợp với quyền hiện tại.
      </p>
    );
  }

  return (
    <nav aria-label="Điều hướng chính" className="space-y-1">
      {visibleItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold transition duration-200 ${
              isActive
                ? "bg-primary-soft text-primary-hover"
                : "text-text-muted hover:bg-surface-subtle hover:text-text"
            }`}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
          >
            <span className="shrink-0">
              {item.href === "/account" || item.href === "/employees" ? (
                <AccountIcon />
              ) : item.href === "/access/roles" || item.href === "/access/accounts" ? (
                <AccessIcon />
              ) : item.href === "/system/cooperatives/new" ||
                item.href === "/cooperative/profile" ? (
                <CooperativeIcon />
              ) : (
                <DashboardIcon />
              )}
            </span>
            <span className={collapsed ? "sr-only" : undefined}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  access,
  accountInitials = "HT",
  accountLabel = "Tài khoản",
  children,
  isLoggingOut = false,
  onLogout,
}: AppShellProps) {
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileNavigationId = useId();
  const mobileDialogRef = useRef<HTMLDialogElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);
  const hasOpenedMobileMenu = useRef(false);

  useEffect(() => {
    const dialog = mobileDialogRef.current;

    if (!isMobileMenuOpen) {
      if (dialog?.open) dialog.close();
      if (hasOpenedMobileMenu.current) mobileMenuButtonRef.current?.focus();
      hasOpenedMobileMenu.current = false;
      return;
    }

    hasOpenedMobileMenu.current = true;
    if (dialog && !dialog.open) dialog.showModal();
    mobileCloseButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const desktopSidebarWidth = isDesktopCollapsed ? "lg:w-20" : "lg:w-72";
  const desktopContentOffset = isDesktopCollapsed ? "lg:pl-20" : "lg:pl-72";

  return (
    <div className="min-h-dvh bg-canvas">
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-surface transition-[width] duration-200 lg:flex lg:flex-col ${desktopSidebarWidth}`}
      >
        <div className="flex min-h-20 items-center justify-between gap-3 border-b border-border px-4">
          <BrandMark compact iconOnly={isDesktopCollapsed} />
          {!isDesktopCollapsed && (
            <button
              aria-label="Thu gọn thanh điều hướng"
              className="grid size-11 shrink-0 place-items-center rounded-control text-text-muted transition hover:bg-surface-subtle hover:text-text"
              onClick={() => setIsDesktopCollapsed(true)}
              type="button"
            >
              <span aria-hidden="true">‹</span>
            </button>
          )}
        </div>

        <div className="flex-1 px-3 py-5">
          <NavigationList access={access} collapsed={isDesktopCollapsed} />
        </div>

        <div className="border-t border-border p-3">
          <LogoutButton
            collapsed={isDesktopCollapsed}
            isPending={isLoggingOut}
            onClick={onLogout}
          />
        </div>

        {isDesktopCollapsed && (
          <button
            aria-label="Mở rộng thanh điều hướng"
            className="mx-auto mb-4 grid size-11 place-items-center rounded-control text-text-muted transition hover:bg-surface-subtle hover:text-text"
            onClick={() => setIsDesktopCollapsed(false)}
            type="button"
          >
            <span aria-hidden="true">›</span>
          </button>
        )}
      </aside>

      <div className={`min-h-dvh transition-[padding] duration-200 ${desktopContentOffset}`}>
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-border bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            aria-controls={mobileNavigationId}
            aria-expanded={isMobileMenuOpen}
            className="inline-flex min-h-11 items-center gap-2 rounded-control px-3 text-sm font-semibold text-text transition hover:bg-surface-subtle lg:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
            ref={mobileMenuButtonRef}
            type="button"
          >
            <MenuIcon />
            Menu
          </button>

          <p className="hidden text-sm font-semibold text-text lg:block">Không gian làm việc</p>

          <Link
            aria-label={`Mở hồ sơ của ${accountLabel}`}
            className="flex min-h-11 min-w-0 items-center gap-3 rounded-control px-2 transition hover:bg-surface-subtle"
            href="/account"
          >
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary-hover"
            >
              {accountInitials}
            </span>
            <span className="max-w-40 truncate text-sm font-semibold text-text">
              {accountLabel}
            </span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-[var(--omts-content-max-width)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      <dialog
        aria-label="Menu trên thiết bị di động"
        className="m-0 h-dvh max-h-none w-[min(20rem,88vw)] max-w-none border-0 bg-transparent p-0 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-[1px] lg:hidden"
        id={mobileNavigationId}
        onCancel={(event) => {
          event.preventDefault();
          setIsMobileMenuOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsMobileMenuOpen(false);
        }}
        ref={mobileDialogRef}
      >
        <aside className="flex h-full flex-col bg-surface p-4 motion-safe:animate-[omts-reveal-from-left_240ms_cubic-bezier(0.22,1,0.36,1)_both]">
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border pb-4">
            <BrandMark compact />
            <button
              className="min-h-11 rounded-control px-3 text-sm font-semibold text-text-muted hover:bg-surface-subtle hover:text-text"
              onClick={() => setIsMobileMenuOpen(false)}
              ref={mobileCloseButtonRef}
              type="button"
            >
              Đóng
            </button>
          </div>

          <div className="flex-1 py-5">
            <NavigationList
              access={access}
              onNavigate={() => setIsMobileMenuOpen(false)}
            />
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex min-w-0 items-center gap-3 px-2">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary-hover"
              >
                {accountInitials}
              </span>
              <span className="truncate text-sm font-semibold text-text">
                {accountLabel}
              </span>
            </div>
            <LogoutButton
              isPending={isLoggingOut}
              onClick={() => {
                setIsMobileMenuOpen(false);
                onLogout();
              }}
            />
          </div>
        </aside>
      </dialog>
    </div>
  );
}
