"use client";
import Link from "next/link";
import { useState } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { HeaderMenu } from "./header-menu";
import { themeColors, useThemeColor, type ThemeColorId } from "./theme-color";
import shell from "./top-shell.module.css";
import styles from "./account-menu.module.css";

/** "+84906021988" → "0906021988"; anything else is shown as given. */
export function displayPhone(phone: string) {
  return phone.startsWith("+84") ? `0${phone.slice(3)}` : phone;
}

type AccountMenuProps = Readonly<{ initials: string; title: string; role: string; isLoggingOut: boolean; onLogout(): void }>;

/**
 * The avatar menu: a profile card (avatar, phone number or name, role, ›) that opens the personal profile, then
 * "Chủ đề" with a colour flyout, then "Đăng xuất".
 */
export function AccountMenu({ initials, title, role, isLoggingOut, onLogout }: AccountMenuProps) {
  // Mounted with the header so a saved colour applies on every page, not only once the menu opens.
  const [color, choose] = useThemeColor();
  return <HeaderMenu label={`Menu tài khoản: ${title}, ${role}`} triggerClassName={shell.avatarButton} panelClassName={styles.panel}
    trigger={<span className={shell.avatar} aria-hidden="true">{initials}</span>}>
    <Link href="/account" className={styles.card} aria-label={`Hồ sơ cá nhân: ${title}, ${role}`}>
      <span className={styles.cardAvatar} aria-hidden="true">{initials}</span>
      <span className={styles.cardText}><strong>{title}</strong><small>{role}</small></span>
      <InterfaceIcon name="chevron-right" className={styles.chevron} />
    </Link>
    <div className={styles.divider} />
    <ThemeRow color={color} onChoose={choose} />
    <button type="button" className={styles.row} disabled={isLoggingOut} onClick={onLogout}>
      <InterfaceIcon name="logout" className={styles.rowIcon} />
      <span className={styles.rowLabel}>{isLoggingOut ? "Đang đăng xuất…" : "Đăng xuất"}</span>
    </button>
  </HeaderMenu>;
}

/** "Chủ đề": the colour flyout; it starts closed each time the menu opens. */
function ThemeRow({ color, onChoose }: { color: ThemeColorId; onChoose(id: ThemeColorId): void }) {
  const [themeOpen, setThemeOpen] = useState(false);
  const current = themeColors.find((item) => item.id === color) ?? themeColors[0];
  return <>
    <div className={styles.themeWrap}>
        <button type="button" className={styles.row} aria-expanded={themeOpen} aria-haspopup="true" onClick={() => setThemeOpen((open) => !open)}>
          <InterfaceIcon name="palette" className={styles.rowIcon} />
          <span className={styles.rowLabel}>Chủ đề</span>
          <span className={styles.swatchSmall} style={{ background: current.base }} aria-hidden="true" />
          <InterfaceIcon name="chevron-right" className={styles.chevron} />
        </button>
        {themeOpen && <div className={styles.flyout} role="group" aria-label="Màu chủ đạo">
          <p className={styles.flyoutTitle}>Màu chủ đạo</p>
          <div className={styles.swatches}>
            {themeColors.map((item) => <button key={item.id} type="button" className={styles.swatch} style={{ background: item.base }} aria-label={item.label} aria-pressed={item.id === color} title={item.label}
              onClick={() => onChoose(item.id)}>{item.id === color && <InterfaceIcon name="check" className={styles.swatchCheck} />}</button>)}
          </div>
          <p className={styles.flyoutHint}>{current.label}</p>
        </div>}
      </div>
  </>;
}
