import Link from "next/link";
import { CooperativeName } from "@/components/brand/cooperative-name-context";
import site from "@/features/public-site/public-site.module.css";
import type { TraceExample } from "./landing-example";
import { LandingExampleCard } from "./landing-example-card";
import s from "./landing.module.css";

/** Màn hình đầu: ảnh nền vùng nuôi, câu hỏi của người mua và thẻ nguồn gốc bấm vào xem được ngay. */
export function LandingHero({ background, example, entry }: { background: string; example: TraceExample; entry: { href: string; label: string } }) {
  return (
    <section className={s.hero} aria-labelledby="hero-title">
      {/* eslint-disable-next-line @next/next/no-img-element -- ảnh nền có thể là ảnh chủ HTX đăng, đi qua proxy ảnh công khai */}
      <img className={s.background} src={background} alt="" fetchPriority="high" />
      <div className={`${site.wrap} ${s.heroGrid}`}>
        <div className={s.heroText}>
          <p className={s.eyebrow}><CooperativeName /> · Vân Đồn, Quảng Ninh</p>
          <h1 id="hero-title" className={s.h1}>Con hàu bạn mua lớn lên ở bè nào?</h1>
          <p className={s.lead}>Quét mã QR trên hóa đơn để xem vùng nuôi, ngày thả giống và ngày thu hoạch của đúng lô hàu đó.</p>
          <div className={s.actions}>
            <Link className={s.primary} href={example.href}>{example.real ? "Xem một lô hàu thật" : "Xem trang truy xuất mẫu"}</Link>
            <Link className={s.secondary} href={entry.href}>{entry.label}</Link>
          </div>
        </div>
        <LandingExampleCard example={example} />
      </div>
    </section>
  );
}
