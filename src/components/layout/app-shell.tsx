"use client";
import { type ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { useCooperativeName } from "@/components/brand/cooperative-name-context";
import type { EffectiveAccess } from "@/features/access/domain/access-types";
import { AppNavigation, permittedGroups, settingsGroups } from "./app-navigation";
import { AccountMenu, displayPhone } from "./account-menu";
import { SettingsMenu, type SettingsSection } from "./header-menu";
import { SettingsRouteFrame } from "@/features/settings/settings-route-frame";
import { SettingsSectionsProvider } from "./settings-sections-context";
import styles from "./top-shell.module.css";
type AppShellProps = { access?: EffectiveAccess; accountInitials?: string; accountLabel?: string; /** Shown instead of the label in the account menu when known. */ accountPhone?: string | null; accountRole?: string; accountScope?: string; children: ReactNode; navigation?: (options: {compact:boolean; onNavigate?:()=>void})=>ReactNode; settingsSections?: readonly SettingsSection[]; topAction?: (compact:boolean)=>ReactNode; isLoggingOut?:boolean; onLogout():void };
export function AppShell({access,accountInitials="HT",accountLabel="Tài khoản",accountPhone,accountRole="Người dùng",accountScope,children,navigation,settingsSections,topAction,isLoggingOut=false,onLogout}:AppShellProps) {
 const settings=settingsSections??permittedGroups(settingsGroups,access);
 const cooperativeName=useCooperativeName();
 return <SettingsSectionsProvider value={settings}><div className={styles.shell}><a className={styles.skip} href="#workspace-main">Đến nội dung chính</a><header className={styles.header}><div className={styles.identity}><Link href="/" className={styles.brand} title="Trang giới thiệu"><BrandMark iconOnly compact/><strong>{cooperativeName}</strong></Link><div className={styles.account}>{topAction?.(false)}<SettingsMenu sections={settings}/><AccountMenu initials={accountInitials} title={accountPhone?displayPhone(accountPhone):accountLabel} role={accountScope||accountRole} isLoggingOut={isLoggingOut} onLogout={onLogout}/></div></div><div className={styles.menu}>{navigation?navigation({compact:false}):<AppNavigation access={access}/>}</div></header><main id="workspace-main" className={styles.main}><SettingsRouteFrame>{children}</SettingsRouteFrame></main></div></SettingsSectionsProvider>;
}
