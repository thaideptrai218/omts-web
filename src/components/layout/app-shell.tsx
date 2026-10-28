"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { InterfaceIcon, type InterfaceIconName } from "@/components/ui/interface-icon";
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
  icon: InterfaceIconName;
  label: string;
  requiredPermission?: EffectivePermissionKey;
}>;

const navigationGroups = [
  {
    label: "Điều hành",
    items: [
      {
        href: "/farming/zones",
        icon: "zone",
        label: "Vùng nuôi",
        requiredPermission: "farming.zones.view",
      },
      {
        href: "/dashboard",
        icon: "dashboard",
        label: "Bảng điều hành",
        requiredPermission: "workspace.overview.view",
      },
      {
        href: "/cooperative/profile",
        icon: "waves",
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
        icon: "users",
        label: "Nhân viên",
        requiredPermission: "cooperative.employees.manage",
      },
      {
        href: "/access/accounts",
        icon: "id-card",
        label: "Tài khoản nội bộ",
        requiredPermission: "access.accounts.manage",
      },
      {
        href: "/access/roles",
        icon: "roles",
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
        icon: "settings",
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
                      <InterfaceIcon name={item.icon} />
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
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isSidebarFocused, setIsSidebarFocused] = useState(false);
  const isSidebarExpanded = isSidebarHovered || isSidebarFocused;
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
    <div data-sidebar-expanded={isSidebarExpanded}
      className={`min-h-dvh bg-canvas lg:grid transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none ${
        isSidebarExpanded ? "lg:grid-cols-[18rem_minmax(0,1fr)]" : "lg:grid-cols-[5rem_minmax(0,1fr)]"
      }`}>
      <aside className="group/sidebar sticky top-0 z-30 hidden h-dvh min-w-0 flex-col overflow-hidden bg-primary-hover text-white lg:flex"
        onMouseEnter={() => setIsSidebarHovered(true)} onMouseLeave={() => setIsSidebarHovered(false)}
        onFocusCapture={() => setIsSidebarFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsSidebarFocused(false);
        }}>
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

      <div className="min-h-dvh min-w-0">
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
