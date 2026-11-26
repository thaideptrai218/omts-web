"use client";
import { useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useSettingsSections } from "@/components/layout/settings-sections-context";
import { settingsItemForPath, settingsItemKey } from "./settings-hub-filter";
import { ScreenGuide } from "@/components/ui/screen-guide";
import styles from "./settings-page.module.css";

const COLLAPSED_KEY = "omts.settings-sidebar.collapsed";
const CHANGED = "omts-settings-sidebar-changed";
/** The choice is kept in this browser; storage that throws (private window) simply leaves the sidebar open. */
function isCollapsed() { try { return window.localStorage.getItem(COLLAPSED_KEY) === "1"; } catch { return false; } }
function setCollapsed(value: boolean) {
  try { window.localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0"); } catch { /* not remembered */ }
  window.dispatchEvent(new Event(CHANGED));
}
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange); window.addEventListener("storage", onChange);
  return () => { window.removeEventListener(CHANGED, onChange); window.removeEventListener("storage", onChange); };
}

/**
 * Every page the gear menu can open (e.g. Hồ sơ hợp tác xã, Nhật ký thao tác) is shown inside the same sidebar as the
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
  const collapsed = useSyncExternalStore(subscribe, isCollapsed, () => false);
  return <div className={styles.page}>
    <p className={styles.crumb}><Link href="/settings">Cài đặt</Link></p>
    <div className={collapsed ? `${styles.layout} ${styles.layoutCollapsed}` : styles.layout}>
      {/* Phones and tablets: one select replaces the list, like the hub. */}
      <select className={styles.picker} aria-label="Chọn thiết lập" value={activeKey} onChange={(event) => {
        const target = sections.flatMap((section) => section.items).find((item) => settingsItemKey(item) === event.target.value);
        if (target) router.push(target.href);
      }}>
        {sections.map((section) => <optgroup key={section.label} label={section.label}>
          {section.items.map((item) => <option key={settingsItemKey(item)} value={settingsItemKey(item)}>{item.label}</option>)}
        </optgroup>)}
      </select>
      <nav className={styles.sidebar} aria-label="Nhóm thiết lập" data-guide="settings-list">
        <button type="button" data-guide="settings-collapse" className={styles.collapse} aria-pressed={collapsed} aria-label={collapsed ? "Mở rộng danh sách cài đặt" : "Thu gọn danh sách cài đặt"} title={collapsed ? "Mở rộng" : "Thu gọn"} onClick={() => setCollapsed(!collapsed)}>
          <InterfaceIcon name="menu" /><span>{collapsed ? "Mở rộng" : "Thu gọn"}</span>
        </button>
        {sections.map((section) => <div key={section.label} className={styles.group}>
          <h2 className={styles.groupLabel}>{section.label}</h2>
          <ul>{section.items.map((item) => <li key={settingsItemKey(item)}>
            <Link href={item.href} title={item.label} aria-current={settingsItemKey(item) === activeKey ? "page" : undefined}><InterfaceIcon name={item.icon} /><span>{item.label}</span></Link>
          </li>)}</ul>
        </div>)}
      </nav>
      <section data-guide="settings-content" className={`${styles.card} ${styles.routeContent}`}>{children}</section>
      <ScreenGuide id="settings-frame" steps={[
        { title: "Chọn mục bên trái", text: "Danh sách này luôn có sẵn; bấm một mục là mở thẳng trang của nó.", target: "[data-guide=\"settings-list\"]" },
        { title: "Sửa ở bên phải", text: "Nội dung của mục hiện ở khung này, bạn chỉnh và lưu tại đó.", target: "[data-guide=\"settings-content\"]" },
        { title: "Thu gọn khi cần chỗ rộng", text: "Bấm Thu gọn để danh sách chỉ còn biểu tượng, nội dung có thêm chỗ.", target: "[data-guide=\"settings-collapse\"]" },
      ]} />
    </div>
  </div>;
}
