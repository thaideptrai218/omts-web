import type { ReactNode } from "react";
import s from "./public-site.module.css";

type Props = {
  lang?: string;
  skipLabel: string;
  headerLabel: string;
  brand: ReactNode;
  /** Liên kết trong trang; ẩn trên màn hình hẹp. */
  nav?: ReactNode;
  action?: ReactNode;
  footer: ReactNode;
  children: ReactNode;
};

/** Khung dùng chung của trang giới thiệu và trang truy xuất: liên kết bỏ qua, đầu trang, vùng main, chân trang. */
export function PublicFrame({ lang, skipLabel, headerLabel, brand, nav, action, footer, children }: Props) {
  return (
    <div className={s.site} lang={lang}>
      <a className={s.skip} href="#noi-dung">{skipLabel}</a>
      <header className={s.header} aria-label={headerLabel}>
        <div className={`${s.wrap} ${s.bar}`}>
          {brand}
          {nav ? <nav className={s.nav} aria-label={headerLabel}>{nav}</nav> : null}
          {action}
        </div>
      </header>
      <main id="noi-dung" tabIndex={-1} className={s.main}>{children}</main>
      <footer className={s.footer}><div className={`${s.wrap} ${s.footRow}`}>{footer}</div></footer>
    </div>
  );
}
