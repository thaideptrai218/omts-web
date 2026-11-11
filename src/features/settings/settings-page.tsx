"use client";
import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useSettingsSections } from "@/components/layout/settings-sections-context";
import { CashBookSettings } from "@/features/cash-book/cash-settings";
import { CustomerSettingsPanel } from "@/features/customers/customer-settings";
import { InputInventorySettings } from "@/features/input-items/inventory-settings";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import styles from "./settings-page.module.css";

/** Settings that open in place on this page; every other item still links to its own page until it is moved here. */
const panels: Record<string, ComponentType> = { "cash-book": CashBookSettings, "input-inventory": InputInventorySettings, customers: CustomerSettingsPanel };

/**
 * Thiết lập: the groups and their items on the left, the chosen item on the right without leaving the page. The selection
 * is kept in `?section=` so a link (e.g. from the gear menu) opens the right item.
 */
export function SettingsPage() {
  const sections = useSettingsSections();
  const [query, setQuery] = useState("");
  const router = useRouter(), chosen = useSearchParams().get("section");
  const term = foldVietnamese(query.trim());
  const visible = useMemo(() => sections
    .map((section) => ({ label: section.label, items: section.items.filter((item) => !term || foldVietnamese(`${item.label} ${item.description ?? ""}`).includes(term)) }))
    .filter((section) => section.items.length), [sections, term]);
  const all = visible.flatMap((section) => section.items);
  const keyOf = (item: (typeof all)[number]) => item.panel ?? item.href;
  const active = all.find((item) => keyOf(item) === chosen) ?? all[0];
  const hasAny = sections.some((section) => section.items.length);

  const select = (key: string) => router.replace(`/settings?section=${encodeURIComponent(key)}`, { scroll: false });

  const Panel = active?.panel ? panels[active.panel] : undefined;
  return <div className={styles.page}>
    <header className={styles.top}>
      <h1>Thiết lập</h1>
      {hasAny && <div className={styles.search}>
        <InterfaceIcon name="search" />
        <input type="search" aria-label="Tìm kiếm thiết lập" placeholder="Tìm kiếm thiết lập" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>}
    </header>
    {!hasAny
      ? <p className={styles.empty} role="status">Tài khoản này hiện chưa có thiết lập nào để quản lý.</p>
      : !visible.length
        ? <p className={styles.empty} role="status">Không tìm thấy thiết lập phù hợp với “{query.trim()}”.</p>
        : <div className={styles.layout}>
          <nav className={styles.sidebar} aria-label="Nhóm thiết lập">
            {visible.map((section) => <div key={section.label} className={styles.group}>
              <h2 className={styles.groupLabel}>{section.label}</h2>
              <ul>{section.items.map((item) => <li key={keyOf(item)}>
                <button type="button" aria-current={active && keyOf(item) === keyOf(active) ? "true" : undefined} onClick={() => select(keyOf(item))}>
                  <InterfaceIcon name={item.icon} /><span>{item.label}</span>
                </button>
              </li>)}</ul>
            </div>)}
          </nav>
          {active && <section className={styles.card} aria-labelledby="settings-panel-title">
            <header className={styles.cardHead}>
              <h2 id="settings-panel-title">{active.label}</h2>
              {active.description && <p>{active.description}</p>}
            </header>
            <div className={styles.cardBody}>
              {Panel ? <Panel /> : <Link href={active.href} className={styles.open}>Mở {active.label.toLowerCase()}<InterfaceIcon name="chevron-right" /></Link>}
            </div>
          </section>}
        </div>}
  </div>;
}
