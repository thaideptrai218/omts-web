import Link from "next/link";
import { flowSteps } from "./landing-content";
import { ArrowRight } from "./landing-icons";
import { HeroPointerLight } from "./landing-hero-pointer-light";
import { LandingZonePlan } from "./landing-zone-plan";
import b from "./landing.module.css";
import s from "./landing-hero.module.css";

/** Màn hình đầu: tuyên bố một câu, hai lối vào, và dải bốn chặng của quy trình. */
export function LandingHero() {
  return (
    <section className={s.hero} aria-labelledby="hero-title">
      <LandingZonePlan className={s.plan} />
      <div className={s.lens} aria-hidden="true"><LandingZonePlan bright className={s.plan} /></div>
      <div className={s.glow} aria-hidden="true" />
      <div className={s.sea} aria-hidden="true">
        {[s.wave1, s.wave2].map((c) => (
          <svg key={c} className={c} viewBox="0 0 2880 120" preserveAspectRatio="none"><path d="M0 60Q180 14 360 60T720 60T1080 60T1440 60T1800 60T2160 60T2520 60T2880 60V120H0Z" /></svg>
        ))}
      </div>
      <HeroPointerLight />
      <div className={s.shade} aria-hidden="true" />
      <div className={`${b.wrap} ${s.body}`}>
        <p className={s.eyebrow}>HTX nuôi hàu Trung Nam · Vân Đồn, Quảng Ninh</p>
        <h1 id="hero-title" className={s.h1}>
          <span>Từ bè đến bàn ăn,</span>
          <span>minh bạch từng lô<span className={s.fire} aria-hidden="true">.</span></span>
        </h1>
        <div className={s.row}>
          <p className={s.lead}>OMTS giúp hợp tác xã Trung Nam quản lý nuôi trồng, thu hoạch, bán hàng và công nợ trên một hệ thống, đồng thời cho người mua quét mã QR để biết con hàu đến từ đâu.</p>
          <div className={s.cta}>
            <Link className={`${b.btn} ${b.btnFire} ${b.btnLg}`} href="/login">Vào hệ thống <ArrowRight /></Link>
            <a className={`${b.btn} ${b.btnLine} ${b.btnLg}`} href="#quy-trinh">Xem quy trình</a>
          </div>
        </div>
      </div>
      <ol className={`${b.wrap} ${s.strip}`} aria-label="Bốn chặng của quy trình">
        {flowSteps.map((f) => <li key={f.step}><a href="#quy-trinh"><span>{f.step}</span>{f.title}</a></li>)}
      </ol>
    </section>
  );
}
