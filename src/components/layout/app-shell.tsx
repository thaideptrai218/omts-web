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
};

const navigationItems = [
  {
    href: "/dashboard",
    label: "Tổng quan",
    requiredPermission: "workspace.overview.view",
  },
] as const satisfies readonly {
  href: string;
  label: string;
  requiredPermission: EffectivePermissionKey;
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
              <DashboardIcon />
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

          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary-hover"
            >
              {accountInitials}
            </span>
            <span className="max-w-40 truncate text-sm font-semibold text-text">
              {accountLabel}
            </span>
          </div>
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
        </aside>
      </dialog>
    </div>
  );
}
