import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { CooperativeName } from "@/components/brand/cooperative-name-context";
import { PublicFrame } from "@/features/public-site/public-frame";
import { SeaScene } from "@/features/public-site/sea-scene";
import site from "@/features/public-site/public-site.module.css";
import type { LandingData } from "@/server/public/landing-page-fetch";
import { defaultImages, navLinks, type LandingImage } from "./landing-content";
import { LandingJourneySection, LandingTraceSection } from "./landing-content-sections";
import type { TraceExample } from "./landing-example";
import { LandingHero } from "./landing-hero";
import { LandingPressSection } from "./landing-press-section";
import { LandingCertificationsSection, LandingProductsSection, LandingTraceGallerySection } from "./landing-showcase-sections";
import sections from "./landing-sections.module.css";

type Props = { data: LandingData | null; example: TraceExample; signedIn?: boolean };

function imagesOf(data: LandingData | null, section: "Background" | "Press" | "Gallery", fallback: LandingImage[]): LandingImage[] {
  const own = data?.photos.filter((photo) => photo.section === section).map((photo) => ({ url: photo.url, caption: photo.caption ?? "" })) ?? [];
  return own.length ? own : fallback;
}

/** Trang giới thiệu công khai tại "/". Ảnh do chủ hợp tác xã đăng; chưa đăng thì dùng ảnh mặc định. */
export function LandingPage({ data, example, signedIn = false }: Props) {
  const entry = signedIn ? { href: "/dashboard", label: "Vào hệ thống" } : { href: "/login", label: "Đăng nhập" };
  const press = imagesOf(data, "Press", defaultImages.press);
  // Không có bài báo nào thì bỏ cả liên kết tới mục đó.
  const links = navLinks.filter((l) => press.length || l.href !== "#bao-chi").map((l) => <a key={l.href} href={l.href}>{l.label}</a>);
  const background = imagesOf(data, "Background", [{ url: defaultImages.background, caption: defaultImages.backgroundCredit }])[0];
  return (
    <PublicFrame
      skipLabel="Bỏ qua, đến nội dung chính"
      headerLabel="Đầu trang giới thiệu"
      brand={<Link href="/" className={site.brand} aria-label="Về đầu trang"><BrandMark compact /></Link>}
      nav={links}
      action={<Link className={site.button} href={entry.href}>{entry.label}</Link>}
      footer={(
        <>
          <p>
            <strong><CooperativeName /></strong>
            {data?.cooperative.officeAddress ?? "Vân Đồn, Quảng Ninh"}
            {data?.cooperative.phoneNumber ? ` · Điện thoại ${data.cooperative.phoneNumber}` : ""}
          </p>
          <nav className={site.footLinks} aria-label="Cuối trang">{links}<a href="/landing/nguon-anh.txt">Nguồn ảnh</a><Link href={entry.href}>{entry.label}</Link></nav>
        </>
      )}
    >
      <LandingHero background={background.url} credit={background.caption} example={example} entry={entry} />
      <LandingProductsSection products={data?.products ?? []} />
      <LandingTraceGallerySection images={imagesOf(data, "Gallery", defaultImages.gallery)} exampleHref={example.href} />
      <LandingJourneySection />
      <LandingTraceSection />
      <LandingCertificationsSection certifications={data?.cooperative.certifications ?? []} />
      <LandingPressSection images={press} />
      <div className={sections.sea} aria-hidden="true"><SeaScene className={sections.scene} /></div>
    </PublicFrame>
  );
}
