import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { LandingCtaSection, LandingFeaturesSection, LandingFlowSection, LandingRolesSection } from "./landing-content-sections";
import { LandingGallery } from "./landing-gallery";
import { LandingHero } from "./landing-hero";
import { LandingMarquee } from "./landing-marquee";
import { navLinks } from "./landing-content";
import { LandingTraceSection } from "./landing-trace-section";
import s from "./landing.module.css";

/** Trang giới thiệu công khai tại "/". Máy chủ render hoàn toàn, không cần phiên đăng nhập. */
export function LandingPage() {
  return (
    <div className={s.page}>
      <a className={s.skip} href="#noi-dung">Bỏ qua điều hướng</a>
      <header className={s.header}>
        <div className={`${s.wrap} ${s.bar}`}>
          <Link href="/" aria-label="HTX Trung Nam, về đầu trang"><BrandMark tone="inverse" compact /></Link>
          <nav className={s.nav} aria-label="Điều hướng trang giới thiệu">
            {navLinks.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
          </nav>
          <div className={s.actions}>
            <Link className={`${s.btn} ${s.btnFire}`} href="/login">Đăng nhập</Link>
          </div>
        </div>
      </header>

      <main id="noi-dung">
        <LandingHero />
        <LandingMarquee />
        <LandingFlowSection />
        <LandingTraceSection />
        <LandingGallery />
        <LandingRolesSection />
        <LandingFeaturesSection />
        <LandingCtaSection />
      </main>

      <footer className={s.footer}>
        <div className={`${s.wrap} ${s.footRow}`}>
          <BrandMark tone="inverse" compact />
          <span>Hệ thống quản lý nuôi hàu và truy xuất nguồn gốc · Vân Đồn, Quảng Ninh</span>
          <Link href="/login">Đăng nhập</Link>
        </div>
      </footer>
    </div>
  );
}
