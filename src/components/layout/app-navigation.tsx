"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  InterfaceIcon,
  type InterfaceIconName,
} from "@/components/ui/interface-icon";
import type {
  EffectiveAccess,
  EffectivePermissionKey,
} from "@/features/access/domain/access-types";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";
import styles from "./app-shell.module.css";

type NavigationItem = Readonly<{
  href: string;
  icon: InterfaceIconName;
  label: string;
  requiredPermission: EffectivePermissionKey;
}>;
export const navigationGroups: readonly Readonly<{
  label: string;
  items: readonly NavigationItem[];
}>[] = [
  {
    label: "Điều hành",
    items: [
      {
        href: "/dashboard",
        icon: "dashboard",
        label: "Bảng điều hành",
        requiredPermission: "workspace.overview.view",
      },
    ],
  },
  {
    label: "Nuôi trồng",
    items: [
      {
        href: "/farming/zones",
        icon: "zone",
        label: "Vùng nuôi",
        requiredPermission: "farming.zones.view",
      },
      {
        href: "/farming/rafts",
        icon: "raft",
        label: "Bè nuôi",
        requiredPermission: "farming.rafts.view",
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
    label: "Hợp tác xã",
    items: [
      {
        href: "/cooperative/profile",
        icon: "waves",
        label: "Hồ sơ hợp tác xã",
        requiredPermission: "cooperative.profile.manage",
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
];

export function AppNavigation({
  access,
  compact = false,
  onNavigate,
}: {
  access?: EffectiveAccess;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        hasEffectivePermission(access, item.requiredPermission),
      ),
    }))
    .filter((group) => group.items.length);
  if (!groups.length)
    return (
      <p className={styles.emptyNavigation}>
        Chưa có mục phù hợp với quyền hiện tại.
      </p>
    );
  return (
    <nav aria-label="Điều hướng chính" className={styles.navigation}>
      {groups.map((group) => (
        <div key={group.label} className={styles.navigationGroup}>
          <p className={styles.groupTitle}>{group.label}</p>
          <ul className={styles.navigationItems}>
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)
                      ? "page"
                      : undefined
                  }
                  title={compact ? item.label : undefined}
                  onClick={onNavigate}
                  className={styles.navigationLink}
                >
                  <span className={styles.iconSlot}>
                    <InterfaceIcon name={item.icon} />
                  </span>
                  <span className={styles.linkLabel}>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
