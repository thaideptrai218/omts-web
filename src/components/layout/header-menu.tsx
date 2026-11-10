"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { InterfaceIcon, type InterfaceIconName } from "@/components/ui/interface-icon";
import styles from "./top-shell.module.css";

type HeaderMenuProps = Readonly<{ label: string; trigger: ReactNode; triggerClassName?: string; panelClassName?: string; children: ReactNode }>;

/** Disclosure button + panel: Escape, outside pointer, focus leaving and choosing a link all close it. */
export function HeaderMenu({ label, trigger, triggerClassName = styles.iconButton, panelClassName, children }: HeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return <div
    ref={root}
    className={styles.profile}
    onKeyDown={(event) => { if (event.key === "Escape" && open) { setOpen(false); button.current?.focus(); } }}
    onBlur={(event) => { if (open && !root.current?.contains(event.relatedTarget as Node | null)) setOpen(false); }}
  >
    <button ref={button} type="button" className={triggerClassName} aria-label={label} aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => setOpen(!open)}>{trigger}</button>
    {open && <div id={panelId} className={panelClassName ? `${styles.accountMenu} ${panelClassName}` : styles.accountMenu} onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>{children}</div>}
  </div>;
}

export type SettingsSection = Readonly<{
  label: string;
  /** `panel` names a settings panel shown in place on the settings page; `href` then opens that page at it. */
  items: readonly Readonly<{ href: string; label: string; icon: InterfaceIconName; description?: string; panel?: string }>[];
}>;

export function SettingsMenu({ sections }: Readonly<{ sections: readonly SettingsSection[] }>) {
  const pathname = usePathname();
  const filled = sections.filter((section) => section.items.length);
  if (!filled.length) return null;
  // The title opens the section's first page; the detail line links every page so none becomes unreachable.
  return <HeaderMenu label="Cài đặt" panelClassName={styles.settingsPanel} trigger={<InterfaceIcon name="gear" />}>
    {filled.map((section) => <div key={section.label} className={styles.settingsRow}>
      <InterfaceIcon name={section.items[0].icon} />
      <div>
        <Link href={section.items[0].href} className={styles.settingsTitle}>{section.label}</Link>
        <span className={styles.settingsLinks}>{section.items.map((item, index) => <span key={item.href}>{index > 0 && ", "}<Link href={item.href} aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}>{item.label}</Link></span>)}</span>
      </div>
    </div>)}
    <div className={styles.settingsFooter}><Link href="/settings" className={styles.settingsAll}>Xem tất cả thiết lập</Link></div>
  </HeaderMenu>;
}
