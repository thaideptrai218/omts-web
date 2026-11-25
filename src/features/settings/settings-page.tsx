"use client";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ScreenGuide } from "@/components/ui/screen-guide";
import { useSettingsSections } from "@/components/layout/settings-sections-context";
import { CashBookSettings } from "@/features/cash-book/cash-settings";
import { CustomerSettingsPanel } from "@/features/customers/customer-settings";
import { InputInventorySettings } from "@/features/input-items/inventory-settings";
import { ProductSettings } from "@/features/products/product-settings";
import { HarvestSettingsPanel } from "./harvest-settings-panel";
import { WaterThresholdSettingsPanel } from "./water-threshold-settings-panel";
import { AttendanceSettingsPanel } from "./attendance-settings-panel";
import { filterSettingsGroups, pickSettingsItem, settingsItemKey, suggestSettingsItems } from "./settings-hub-filter";
import styles from "./settings-page.module.css";

/** Settings that open in place on this page; every other item opens its own page at once (inside the same sidebar). */
const panels: Record<string, ComponentType> = { "cash-book": CashBookSettings, "input-inventory": InputInventorySettings, products: ProductSettings, customers: CustomerSettingsPanel, harvest: HarvestSettingsPanel, "water-thresholds": WaterThresholdSettingsPanel, attendance: AttendanceSettingsPanel };

/**
 * Thiết lập hub: the groups and their items on the left (a select on phones), the chosen item on the right without leaving
 * the page. The selection lives in `?section=` (an item) or `?group=` (a group's first item) so links can deep-link into it.
 */
export function SettingsPage() {
  const sections = useSettingsSections();
  const [query, setQuery] = useState("");
  const router = useRouter(), params = useSearchParams();
  const visible = useMemo(() => filterSettingsGroups(sections, query), [sections, query]);
  const active = pickSettingsItem(visible, params.get("section"), params.get("group"));
  const suggestions = useMemo(() => suggestSettingsItems(sections), [sections]);
  const itemCount =sections.reduce((total, section) => total + section.items.length, 0);
  const hasAny = itemCount > 0;

  const select = (key: string) => {
    const item = sections.flatMap((section) => section.items).find((entry) => settingsItemKey(entry) === key);
    if (item && !item.panel) router.push(item.href); else router.replace(`/settings?section=${encodeURIComponent(key)}`, { scroll: false });
  };
  // Landing on /settings (or a link-only deep link) goes straight to that page; typing in the search never jumps.
  const target = active && !active.panel && !query ? active.href : undefined;
  useEffect(() => { if (target) router.replace(target); }, [target, router]);

  const Panel = active?.panel ? panels[active.panel] : undefined;
  return <div className={styles.page}>
    <header className={styles.top}>
      <h1>Cài đặt</h1>
      {itemCount > 1 && <div className={styles.search}>
        <InterfaceIcon name="search" />
        <input type="search" aria-label="Tìm kiếm thiết lập" placeholder="Tìm kiếm thiết lập" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>}
    </header>
    {hasAny && <ScreenGuide id="settings-hub" steps={[
      { title: "Chọn một mục bên trái", text: "Mỗi mục là một nhóm thiết lập, ví dụ sổ quỹ, sản phẩm hay thu hoạch." },
      { title: "Sửa ngay bên phải", text: "Mục thiết lập hiện ngay trên trang này; mục khác mở thẳng trang của nó, vẫn giữ danh sách bên trái." },
      { title: "Chỉ thấy phần bạn được sửa", text: "Mục nào không hiện nghĩa là bạn chưa được cấp quyền chỉnh." },
    ]} />}
    {!hasAny
      ? <div className={styles.empty} role="status">
        <p>Bạn chưa có thiết lập nào để chỉnh. Các thiết lập do Chủ hợp tác xã hoặc người được cấp quyền quản lý.</p>
        <p><Link href="/dashboard" className={styles.open}>Về tổng quan</Link></p>
      </div>
      : !visible.length
        ? <div className={styles.empty} role="status">
          <p>Không tìm thấy thiết lập phù hợp với “{query.trim()}”.</p>
          <p className={styles.suggest}>Thử: {suggestions.map((item, index) => <span key={settingsItemKey(item)}>
            {index > 0 && ", "}
            <button type="button" className={styles.suggestion} onClick={() => { setQuery(""); select(settingsItemKey(item)); }}>{item.label}</button>
          </span>)}…</p>
        </div>
        : <div className={styles.layout}>
          {/* Phones: one select replaces the long list so the content is not pushed below the fold. */}
          <select className={styles.picker} aria-label="Chọn thiết lập" value={active ? settingsItemKey(active) : ""} onChange={(event) => select(event.target.value)}>
            {visible.map((section) => <optgroup key={section.label} label={section.label}>
              {section.items.map((item) => <option key={settingsItemKey(item)} value={settingsItemKey(item)}>{item.label}</option>)}
            </optgroup>)}
          </select>
          <nav className={styles.sidebar} aria-label="Nhóm thiết lập">
            {visible.map((section) => <div key={section.label} className={styles.group}>
              <h2 className={styles.groupLabel}>{section.label}</h2>
              <ul>{section.items.map((item) => <li key={settingsItemKey(item)}>
                <button type="button" aria-current={active && settingsItemKey(item) === settingsItemKey(active) ? "true" : undefined} onClick={() => select(settingsItemKey(item))}>
                  <InterfaceIcon name={item.icon} /><span>{item.label}</span>
                </button>
              </li>)}</ul>
            </div>)}
          </nav>
          {active && <section className={styles.card} aria-labelledby="settings-panel-title">
            <header className={styles.cardHead}>
              <h2 id="settings-panel-title">{active.label}</h2>
              {active.description && <p>{active.description}</p>}
              {active.editor && <p className={styles.editor}>{active.editor}</p>}
            </header>
            <div className={styles.cardBody}>
              {Panel ? <Panel /> : active.hint ? <p className={styles.hint}>{active.hint}</p> : null}
            </div>
          </section>}
        </div>}
  </div>;
}
