"use client";
import { type ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import type { EffectiveAccess } from "@/features/access/domain/access-types";
import { AppNavigation } from "./app-navigation";
import styles from "./top-shell.module.css";
type AppShellProps = { access?: EffectiveAccess; accountInitials?: string; accountLabel?: string; accountRole?: string; accountScope?: string; children: ReactNode; navigation?: (options: {compact:boolean; onNavigate?:()=>void})=>ReactNode; topAction?: (compact:boolean)=>ReactNode; isLoggingOut?:boolean; onLogout():void };
export function AppShell({access,accountInitials="HT",accountLabel="Tài khoản",accountRole="Người dùng",accountScope,children,navigation,topAction,isLoggingOut=false,onLogout}:AppShellProps) {
 return <div className={styles.shell}><a className={styles.skip} href="#workspace-main">Đến nội dung chính</a><header className={styles.header}><div className={styles.identity}><Link href="/dashboard" className={styles.brand}><BrandMark iconOnly compact/><span><strong>HTX Thủy sản Trung Nam</strong><small>Quản lý nuôi hàu & truy xuất nguồn gốc</small></span></Link><div className={styles.account}>{topAction?.(false)}<details className={styles.profile}><summary aria-label="Menu tài khoản"><span className={styles.avatar}>{accountInitials}</span><span className={styles.accountName}>{accountLabel}<small>{accountRole}</small></span><span aria-hidden="true">⌄</span></summary><div className={styles.accountMenu}><p>{accountLabel}<small>{accountScope || accountRole}</small></p><Link href="/account">Hồ sơ cá nhân</Link><button type="button" disabled={isLoggingOut} onClick={onLogout}>{isLoggingOut?"Đang đăng xuất…":"Đăng xuất"}</button></div></details></div></div><div className={styles.menu}>{navigation?navigation({compact:false}):<AppNavigation access={access}/>}</div></header><main id="workspace-main" className={styles.main}>{children}</main></div>;
}
