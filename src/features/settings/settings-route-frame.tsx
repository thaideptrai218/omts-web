"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useSettingsSections } from "@/components/layout/settings-sections-context";
import { settingsItemForPath, settingsItemKey } from "./settings-hub-filter";
import styles from "./settings-page.module.css";

/**
 * Every page the gear menu can open (e.g. Hồ sơ hợp tác xã, Quản lý người dùng) is shown inside the same sidebar as the
 * Thiết lập hub, with its own entry selected. The sidebar lists exactly the permitted gear items, so nothing the viewer
 * may not use appears. Any other page (and `/settings` itself, which draws its own layout) is returned untouched.
 */
export function SettingsRouteFrame({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname(), sections = useSettingsSections();
  const active = settingsItemForPath(sections, pathname);
  return active ? <Frame activeKey={settingsItemKey(active)}>{children}</Frame> : <>{children}</>;
}

function Frame({ activeKey, children }: Readonly<{ activeKey: string; children: ReactNode }>) {
  const sections = useSettingsSections(), router = useRouter();
  return <div className={styles.page}>
    <p className={styles.crumb}><Link href="/settings">Cài đặt</Link></p>
    <div className={styles.layout}>
      {/* Phones and tablets: one select replaces the list, like the hub. */}
      <select className={styles.picker} aria-label="Chọn thiết lập" value={activeKey} onChange={(event) => {
        const target = sections.flatMap((section) => section.items).find((item) => settingsItemKey(item) === event.target.value);
        if (target) router.push(target.href);
      }}>
        {sections.map((section) => <optgroup key={section.label} label={section.label}>
          {section.items.map((item) => <option key={settingsItemKey(item)} value={settingsItemKey(item)}>{item.label}</option>)}
        </optgroup>)}
      </select>
      <nav className={styles.sidebar} aria-label="Nhóm thiết lập">
        {sections.map((section) => <div key={section.label} className={styles.group}>
          <h2 className={styles.groupLabel}>{section.label}</h2>
          <ul>{section.items.map((item) => <li key={settingsItemKey(item)}>
            <Link href={item.href} aria-current={settingsItemKey(item) === activeKey ? "page" : undefined}><InterfaceIcon name={item.icon} /><span>{item.label}</span></Link>
          </li>)}</ul>
        </div>)}
      </nav>
      <section className={`${styles.card} ${styles.routeContent}`}>{children}</section>
    </div>
  </div>;
}
