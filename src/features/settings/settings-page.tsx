"use client";
import { useId, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useSettingsSections } from "@/components/layout/settings-sections-context";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import styles from "./settings-page.module.css";

/** Full list of the settings destinations the signed-in account may open; the same source as the header gear menu. */
export function SettingsPage() {
  const sections = useSettingsSections();
  const prefix = useId();
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string>();
  const term = foldVietnamese(query.trim());
  const visible = useMemo(() => sections
    .map((section, index) => ({
      id: `${prefix}-${index}`,
      label: section.label,
      icon: section.items[0]?.icon,
      items: section.items.filter((item) => !term || foldVietnamese(`${item.label} ${item.description ?? ""}`).includes(term)),
    }))
    .filter((section) => section.items.length), [sections, term, prefix]);
  const activeId = visible.some((section) => section.id === chosen) ? chosen : visible[0]?.id;
  const hasAny = sections.some((section) => section.items.length);

  function select(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    setChosen(id);
    const target = document.getElementById(id);
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView?.({ behavior: calm ? "auto" : "smooth", block: "start" });
  }

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
            <ul>{visible.map((section) => <li key={section.id}>
              <a href={`#${section.id}`} aria-current={section.id === activeId ? "true" : undefined} onClick={(event) => select(event, section.id)}>
                {section.icon && <InterfaceIcon name={section.icon} />}<span>{section.label}</span>
              </a>
            </li>)}</ul>
          </nav>
          <div className={styles.content}>
            {visible.map((section) => <section key={section.id} id={section.id} className={styles.card} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`}>{section.label}</h2>
              <ul>{section.items.map((item) => <li key={item.href}>
                <Link href={item.href} className={styles.row}>
                  <span className={styles.rowText}><strong>{item.label}</strong>{item.description && <span>{item.description}</span>}</span>
                  <InterfaceIcon name="chevron-right" />
                </Link>
              </li>)}</ul>
            </section>)}
          </div>
        </div>}
  </div>;
}
