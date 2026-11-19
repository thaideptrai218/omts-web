import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { CooperativeName } from "@/components/brand/cooperative-name-context";
import type { OriginLanguage } from "@/server/public/origin-qr-token";
import type { OriginCopy } from "./origin-copy";
import s from "./origin-base.module.css";

type Props = {
  language: OriginLanguage;
  copy: OriginCopy;
  /** Liên kết đổi ngôn ngữ; null khi chưa có trang hợp lệ để đổi. */
  langHrefs: Readonly<{ vi: string; en: string }> | null;
  hero?: ReactNode;
  /** Tên và logo của HTX từ hồ sơ HTX (logo đã qua proxy ảnh). Không có thì dùng nhận diện chung của ứng dụng. */
  brand?: Readonly<{ name: string; logoUrl: string | null }>;
  children: ReactNode;
};

/** Khung trang: liên kết bỏ qua, đầu trang có nhận diện HTX và chuyển ngôn ngữ, vùng main, chân trang. */
export function OriginPageShell({ language, copy, langHrefs, hero, brand, children }: Props) {
  return (
    <div className={s.page} lang={language}>
      <a className={s.skip} href="#noi-dung">{copy.skip}</a>
      <header className={s.header} aria-label={copy.headerLabel}>
        <div className={`${s.wrap} ${s.bar}`}>
          {brand ? (
            <div className={s.brand}>
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- logo qua proxy ảnh của trang công khai, không đi qua trình tối ưu ảnh của Next
                <img className={s.brandLogo} src={brand.logoUrl} alt="" width={36} height={36} decoding="async" referrerPolicy="no-referrer" />
              ) : null}
              <span className={s.brandName}>{brand.name}</span>
            </div>
          ) : <BrandMark compact />}
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
      <footer className={s.footer}><p className={s.wrap}><CooperativeName />. {copy.footer}</p></footer>
    </div>
  );
}
