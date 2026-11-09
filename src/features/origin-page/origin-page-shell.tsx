import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import type { OriginLanguage } from "@/server/public/origin-qr-token";
import type { OriginCopy } from "./origin-copy";
import s from "./origin-base.module.css";

type Props = {
  language: OriginLanguage;
  copy: OriginCopy;
  /** Liên kết đổi ngôn ngữ; null khi chưa có trang hợp lệ để đổi. */
  langHrefs: Readonly<{ vi: string; en: string }> | null;
  hero?: ReactNode;
  children: ReactNode;
};

/** Khung trang: liên kết bỏ qua, đầu trang có nhận diện HTX và chuyển ngôn ngữ, vùng main, chân trang. */
export function OriginPageShell({ language, copy, langHrefs, hero, children }: Props) {
  return (
    <div className={s.page} lang={language}>
      <a className={s.skip} href="#noi-dung">{copy.skip}</a>
      <header className={s.header} aria-label={copy.headerLabel}>
        <div className={`${s.wrap} ${s.bar}`}>
          <BrandMark compact />
          {langHrefs ? (
            <nav aria-label={copy.langLabel} className={s.lang}>
              <a href={langHrefs.vi} lang="vi" hrefLang="vi" aria-current={language === "vi" ? "true" : undefined}>Tiếng Việt</a>
              <a href={langHrefs.en} lang="en" hrefLang="en" aria-current={language === "en" ? "true" : undefined}>English</a>
            </nav>
          ) : null}
        </div>
      </header>
      <main id="noi-dung" tabIndex={-1} className={s.main}>
        {hero}
        <div className={`${s.wrap} ${s.content}`}>{children}</div>
      </main>
      <footer className={s.footer}><p className={s.wrap}>{copy.footer}</p></footer>
    </div>
  );
}
