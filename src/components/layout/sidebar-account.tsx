"use client";
import Link from "next/link";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import styles from "./app-shell.module.css";

export function SidebarAccount({
  initials,
  label,
  role,
  scope,
  compact,
  pending,
  onNavigate,
  onLogout,
}: {
  initials: string;
  label: string;
  role: string;
  scope?: string;
  compact?: boolean;
  pending: boolean;
  onNavigate?: () => void;
  onLogout(): void;
}) {
  return (
    <div className={styles.footer}>
      <Link
        href="/account"
        className={styles.identity}
        aria-label={[label, role, scope].filter(Boolean).join(", ")}
        title={[label, role, scope].filter(Boolean).join("\n")}
        onClick={onNavigate}
      >
        <span aria-hidden="true" className={styles.avatar}>
          {initials}
        </span>
        <span className={styles.identityText}>
          <span className={styles.accountName}>{label}</span>
          <span className={styles.accountRole}>{role}</span>
          {scope && <span className={styles.accountScope}>{scope}</span>}
        </span>
      </Link>
      <button
        type="button"
        aria-label={pending ? "Đang đăng xuất..." : "Đăng xuất"}
        aria-busy={pending || undefined}
        title={compact ? "Đăng xuất" : undefined}
        disabled={pending}
        onClick={onLogout}
        className={styles.logout}
      >
        <span className={styles.iconSlot}>
          {pending ? (
            <span
              aria-hidden="true"
              className="size-5 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
            />
          ) : (
            <InterfaceIcon name="logout" />
          )}
        </span>
        <span className={styles.linkLabel}>
          {pending ? "Đang đăng xuất..." : "Đăng xuất"}
        </span>
      </button>
    </div>
  );
}
