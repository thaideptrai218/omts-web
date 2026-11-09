"use client";
import { type ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import type { EffectiveAccess } from "@/features/access/domain/access-types";
import { AppNavigation, permittedGroups, settingsGroups } from "./app-navigation";
import { HeaderMenu, SettingsMenu, type SettingsSection } from "./header-menu";
import { SettingsSectionsProvider } from "./settings-sections-context";
import styles from "./top-shell.module.css";
type AppShellProps = { access?: EffectiveAccess; accountInitials?: string; accountLabel?: string; accountRole?: string; accountScope?: string; children: ReactNode; navigation?: (options: {compact:boolean; onNavigate?:()=>void})=>ReactNode; settingsSections?: readonly SettingsSection[]; topAction?: (compact:boolean)=>ReactNode; isLoggingOut?:boolean; onLogout():void };
export function AppShell({access,accountInitials="HT",accountLabel="Tài khoản",accountRole="Người dùng",accountScope,children,navigation,settingsSections,topAction,isLoggingOut=false,onLogout}:AppShellProps) {
 const settings=settingsSections??permittedGroups(settingsGroups,access);
 return <SettingsSectionsProvider value={settings}><div className={styles.shell}><a className={styles.skip} href="#workspace-main">Đến nội dung chính</a><header className={styles.header}><div className={styles.identity}><Link href="/dashboard" className={styles.brand}><BrandMark iconOnly compact/><strong>HTX Thủy sản Trung Nam</strong></Link><div className={styles.account}>{topAction?.(false)}<SettingsMenu sections={settings}/><HeaderMenu label={`Menu tài khoản: ${accountLabel}, ${accountRole}`} triggerClassName={styles.avatarButton} trigger={<span className={styles.avatar} aria-hidden="true">{accountInitials}</span>}><p>{accountLabel}<small>{accountScope||accountRole}</small></p><Link href="/account">Hồ sơ cá nhân</Link><button type="button" disabled={isLoggingOut} onClick={onLogout}>{isLoggingOut?"Đang đăng xuất…":"Đăng xuất"}</button></HeaderMenu></div></div><div className={styles.menu}>{navigation?navigation({compact:false}):<AppNavigation access={access}/>}</div></header><main id="workspace-main" className={styles.main}>{children}</main></div></SettingsSectionsProvider>;
}
