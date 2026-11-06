"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useDocumentScrollLock } from "@/components/ui/use-document-scroll-lock";
import type { EffectiveAccess } from "@/features/access/domain/access-types";
import { AppNavigation } from "./app-navigation";
import { SidebarAccount } from "./sidebar-account";
import { useSidebarExpansion } from "./use-sidebar-expansion";
import styles from "./app-shell.module.css";

type AppShellProps = {
  access?: EffectiveAccess;
  accountInitials?: string;
  accountLabel?: string;
  accountRole?: string;
  accountScope?: string;
  children: ReactNode;
  navigation?: (options: { compact: boolean; onNavigate?: () => void }) => ReactNode;
  topAction?: (compact: boolean) => ReactNode;
  isLoggingOut?: boolean;
  onLogout(): void;
};

export function AppShell({
  access,
  accountInitials = "HT",
  accountLabel = "Tài khoản",
  accountRole = "Người dùng",
  accountScope,
  children,
  navigation,
  topAction,
  isLoggingOut = false,
  onLogout,
}: AppShellProps) {
  const sidebar = useSidebarExpansion();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const desktopNavigationId = useId();
  const navigationScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = navigationScrollRef.current;
    if (!node) return;
    try { node.scrollTop = Number(sessionStorage.getItem("omts-sidebar-scroll") ?? 0); } catch { /* Storage may be unavailable. */ }
    const save = () => { try { sessionStorage.setItem("omts-sidebar-scroll", String(node.scrollTop)); } catch { /* Navigation still works without storage. */ } };
    node.addEventListener("scroll", save, { passive: true });
    return () => { node.removeEventListener("scroll", save); };
  }, []);
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

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const desktop = window.matchMedia("(min-width: 64rem)");
    function closeMobileOnDesktop(event: MediaQueryListEvent) {
      if (event.matches) setIsMobileMenuOpen(false);
    }
    desktop.addEventListener("change", closeMobileOnDesktop);
    return () => desktop.removeEventListener("change", closeMobileOnDesktop);
  }, []);

  const identity = {
    initials: accountInitials,
    label: accountLabel,
    role: accountRole,
    scope: accountScope,
    pending: isLoggingOut,
  };
  return (
    <div
      className={styles.shell}
      data-sidebar-expanded={sidebar.expanded}
      data-sidebar-pinned={sidebar.pinned}
    >
      <aside
        aria-label="Thanh điều hướng"
        className={styles.desktopSidebar}
        onMouseEnter={sidebar.enter}
        onMouseLeave={sidebar.leave}
        onFocusCapture={sidebar.focus}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            sidebar.blur();
        }}
      >
        <div className={styles.brand}>
          <span aria-hidden="true">
            <BrandMark iconOnly compact />
          </span>
          <span className={styles.brandText}>
            <strong>HTX Trung Nam</strong>
            <small>Nuôi hàu · Truy xuất nguồn gốc</small>
          </span>
        </div>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.toggle}
            aria-label={sidebar.toggleLabel}
            title={sidebar.toggleLabel}
            aria-expanded={sidebar.expanded}
            aria-controls={desktopNavigationId}
            onClick={sidebar.toggle}
          >
            <span className={styles.iconSlot}>
              <InterfaceIcon
                name={sidebar.pinned ? "panel-close" : "panel-open"}
              />
            </span>
            <span className={styles.linkLabel}>{sidebar.toggleLabel}</span>
          </button>
        </div>
        <div id={desktopNavigationId} ref={navigationScrollRef} className={styles.scrollArea}>
          {navigation ? navigation({ compact: !sidebar.expanded }) : <AppNavigation access={access} compact={!sidebar.expanded} />}
        </div>
        <SidebarAccount
          {...identity}
          compact={!sidebar.expanded}
          onLogout={onLogout}
        />
      </aside>

      <div className={styles.content}>
        {topAction && <header className={styles.desktopHeader}><span>Hợp tác xã Thủy sản Trung Nam</span>{topAction(false)}</header>}
        <header className={styles.mobileHeader}>
          <BrandMark compact />
          {topAction?.(true)}
          <button
            type="button"
            className={styles.mobileMenuButton}
            ref={mobileMenuButtonRef}
            aria-controls={mobileNavigationId}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <InterfaceIcon name="menu" />
            Mở điều hướng
          </button>
        </header>
        <main className={styles.main}>{children}</main>
      </div>

      <dialog
        aria-label="Điều hướng trên thiết bị di động"
        className={styles.mobileDialog}
        id={mobileNavigationId}
        ref={mobileDialogRef}
        onCancel={(event) => {
          event.preventDefault();
          setIsMobileMenuOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsMobileMenuOpen(false);
        }}
      >
        <aside className={styles.mobilePanel}>
          <div className={styles.mobileBrand}>
            <BrandMark compact />
            <button
              type="button"
              className={styles.mobileClose}
              ref={mobileCloseButtonRef}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Đóng
            </button>
          </div>
          <div className={styles.scrollArea}>
            {navigation ? navigation({ compact: false, onNavigate: () => setIsMobileMenuOpen(false) }) : <AppNavigation
              access={access}
              onNavigate={() => setIsMobileMenuOpen(false)}
            />}
          </div>
          <SidebarAccount
            {...identity}
            onNavigate={() => setIsMobileMenuOpen(false)}
            onLogout={() => {
              setIsMobileMenuOpen(false);
              onLogout();
            }}
          />
        </aside>
      </dialog>
    </div>
  );
}
