"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { useDocumentScrollLock } from "@/components/ui/use-document-scroll-lock";
import type {
  EffectiveAccess,
  EffectivePermissionKey,
} from "@/features/access/domain/access-types";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";

type AppShellProps = {
  access?: EffectiveAccess;
  accountInitials?: string;
  accountLabel?: string;
  accountRole?: string;
  accountScope?: string;
  children: ReactNode;
  isLoggingOut?: boolean;
  onLogout: () => void;
};

type NavigationItem = Readonly<{
  href: string;
  icon: "account" | "access" | "cooperative" | "dashboard" | "employee";
  label: string;
  requiredPermission?: EffectivePermissionKey;
}>;

const navigationGroups = [
  {
    label: "Điều hành",
    items: [
      {
        href: "/dashboard",
        icon: "dashboard",
        label: "Bảng điều hành",
        requiredPermission: "workspace.overview.view",
      },
      {
        href: "/cooperative/profile",
        icon: "cooperative",
        label: "Hồ sơ hợp tác xã",
        requiredPermission: "cooperative.profile.manage",
      },
    ],
  },
  {
    label: "Nhân sự & phân quyền",
    items: [
      {
        href: "/employees",
        icon: "employee",
        label: "Nhân viên",
        requiredPermission: "cooperative.employees.manage",
      },
      {
        href: "/access/accounts",
        icon: "account",
        label: "Tài khoản nội bộ",
        requiredPermission: "access.accounts.manage",
      },
      {
        href: "/access/roles",
        icon: "access",
        label: "Vai trò & quyền",
        requiredPermission: "access.roles.manage",
      },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      {
        href: "/system/cooperatives/new",
        icon: "cooperative",
        label: "Khởi tạo hợp tác xã",
        requiredPermission: "platform.cooperative.provision",
      },
    ],
  },
] as const satisfies readonly Readonly<{
  label: string;
  items: readonly NavigationItem[];
}>[];

function MenuIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function NavigationIcon({ kind }: { kind: NavigationItem["icon"] }) {
  if (kind === "dashboard") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
        <rect height="5.25" rx="1.25" stroke="currentColor" strokeWidth="1.6" width="5.25" x="3" y="3" />
        <rect height="5.25" rx="1.25" stroke="currentColor" strokeWidth="1.6" width="5.25" x="11.75" y="3" />
        <rect height="5.25" rx="1.25" stroke="currentColor" strokeWidth="1.6" width="5.25" x="3" y="11.75" />
        <rect height="5.25" rx="1.25" stroke="currentColor" strokeWidth="1.6" width="5.25" x="11.75" y="11.75" />
      </svg>
    );
  }

  if (kind === "account" || kind === "employee") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
        <circle cx="10" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 16c.75-3 2.75-4.5 6-4.5s5.25 1.5 6 4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      </svg>
    );
  }

  if (kind === "access") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
        <path d="M10 2.75 16 5v4.5c0 3.65-2.2 6.2-6 7.75-3.8-1.55-6-4.1-6-7.75V5l6-2.25Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
        <path d="m7.5 10 1.55 1.55L12.75 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path d="M3.5 16.25h13M5 16.25V7.5l5-3.75 5 3.75v8.75M7.5 9.5h5M7.5 12.25h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path d="M8 4H4.75A1.75 1.75 0 0 0 3 5.75v8.5C3 15.22 3.78 16 4.75 16H8m3-3.25L13.75 10 11 7.25M6.5 10h7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

function LogoutButton({
  autoRail = false,
  isPending = false,
  onClick,
}: {
  autoRail?: boolean;
  isPending?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-busy={isPending || undefined}
      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-sky-50/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isPending}
      onClick={onClick}
      type="button"
    >
      {isPending ? (
        <span aria-hidden="true" className="size-5 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />
      ) : (
        <LogoutIcon />
      )}
      <span
        className={
          autoRail
            ? "whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none"
            : undefined
        }
      >
        {isPending ? "Đang đăng xuất..." : "Đăng xuất"}
      </span>
    </button>
  );
}

function NavigationList({
  access,
  autoRail = false,
  onNavigate,
}: {
  access?: EffectiveAccess;
  autoRail?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const visibleGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.requiredPermission ||
          hasEffectivePermission(access, item.requiredPermission),
      ),
    }))
    .filter((group) => group.items.length > 0);

  if (visibleGroups.length === 0) {
    return (
      <p className="px-3 text-sm leading-6 text-sky-50/80">
        Chưa có mục phù hợp với quyền hiện tại.
      </p>
    );
  }

  return (
    <nav aria-label="Điều hướng chính" className="space-y-6">
      {visibleGroups.map((group) => (
        <div key={group.label}>
          <p
            className={`mb-2 whitespace-nowrap px-3 text-xs font-semibold text-sky-100/80 ${
              autoRail
                ? "opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none"
                : ""
            }`}
          >
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      isActive
                        ? "bg-white text-primary shadow-lg shadow-black/10"
                        : "text-sky-50/80 hover:bg-white/10 hover:text-white"
                    }`}
                    href={item.href}
                    onClick={onNavigate}
                  >
                    <span className={isActive ? "text-primary" : "text-sky-100/80 group-hover:text-white"}>
                      <NavigationIcon kind={item.icon} />
                    </span>
                    <span
                      className={`whitespace-nowrap ${
                        autoRail
                          ? "opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none"
                          : ""
                      }`}
                    >
                      {item.label}
                    </span>
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className={`ml-auto size-1.5 shrink-0 rounded-full bg-primary ${
                          autoRail
                            ? "opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100"
                            : ""
                        }`}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function IdentityCard({
  autoRail = false,
  initials,
  label,
  role,
  scope,
  onNavigate,
}: {
  autoRail?: boolean;
  initials: string;
  label: string;
  role: string;
  scope?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      className={`flex min-w-0 items-center gap-3 rounded-xl transition duration-200 hover:bg-white/10 ${
        autoRail ? "p-1" : "p-2.5"
      }`}
      href="/account"
      onClick={onNavigate}
    >
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sm font-bold text-primary shadow-sm">
        {initials}
      </span>
      <span
        className={`min-w-0 whitespace-nowrap ${
          autoRail
            ? "opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none"
            : ""
        }`}
      >
        <span className="block truncate text-sm font-semibold text-white">{label}</span>
        <span className="block truncate text-xs text-sky-50/80">
          {role}{scope ? ` · ${scope}` : ""}
        </span>
      </span>
    </Link>
  );
}

export function AppShell({
  access,
  accountInitials = "HT",
  accountLabel = "Tài khoản",
  accountRole = "Người dùng",
  accountScope,
  children,
  isLoggingOut = false,
  onLogout,
}: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileNavigationId = useId();
  const mobileDialogRef = useRef<HTMLDialogElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);
  const hasOpenedMobileMenu = useRef(false);

  useDocumentScrollLock(isMobileMenuOpen);

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
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-dvh bg-canvas lg:pl-20">
      <aside className="group/sidebar fixed inset-y-0 left-0 z-30 hidden w-20 flex-col overflow-hidden bg-primary-hover text-white shadow-none transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-72 hover:shadow-2xl focus-within:w-72 focus-within:shadow-2xl motion-reduce:transition-none lg:flex">
        <div aria-hidden="true" className="pointer-events-none absolute -left-28 top-28 size-64 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative flex min-h-24 items-center border-b border-white/10 px-4">
          <div className="min-w-56">
            <BrandMark autoReveal tone="inverse" />
          </div>
        </div>
        <div className="relative flex-1 overflow-y-auto overflow-x-hidden px-4 py-6">
          <NavigationList access={access} autoRail />
        </div>
        <div className="relative space-y-2 border-t border-white/10 p-4">
          <IdentityCard autoRail initials={accountInitials} label={accountLabel} role={accountRole} scope={accountScope} />
          <LogoutButton autoRail isPending={isLoggingOut} onClick={onLogout} />
        </div>
      </aside>

      <div className="min-h-dvh">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
          <BrandMark compact />
          <button
            aria-controls={mobileNavigationId}
            aria-expanded={isMobileMenuOpen}
            className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border px-3 text-sm font-semibold text-text transition hover:bg-surface-subtle"
            onClick={() => setIsMobileMenuOpen(true)}
            ref={mobileMenuButtonRef}
            type="button"
          >
            <MenuIcon /> Menu
          </button>
        </header>
        <main className="mx-auto w-full max-w-[var(--omts-content-max-width)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      <dialog
        aria-label="Menu trên thiết bị di động"
        className="m-0 h-dvh max-h-none w-[min(20rem,88vw)] max-w-none border-0 bg-transparent p-0 shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm lg:hidden"
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
        <aside className="flex h-full flex-col bg-primary-hover p-4 text-white motion-safe:animate-[omts-reveal-from-left_220ms_cubic-bezier(0.22,1,0.36,1)_both]">
          <div className="flex min-h-16 items-center justify-between gap-3 border-b border-white/10 pb-4">
            <BrandMark tone="inverse" compact />
            <button
              className="min-h-11 rounded-xl px-3 text-sm font-semibold text-sky-50/80 hover:bg-white/10 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
              ref={mobileCloseButtonRef}
              type="button"
            >
              Đóng
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-6">
            <NavigationList access={access} onNavigate={() => setIsMobileMenuOpen(false)} />
          </div>
          <div className="space-y-2 border-t border-white/10 pt-4">
            <IdentityCard initials={accountInitials} label={accountLabel} role={accountRole} scope={accountScope}
              onNavigate={() => setIsMobileMenuOpen(false)} />
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
