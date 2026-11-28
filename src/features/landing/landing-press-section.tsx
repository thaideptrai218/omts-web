import { CooperativeName } from "@/components/brand/cooperative-name-context";
import site from "@/features/public-site/public-site.module.css";
import type { LandingImage } from "./landing-content";
import s from "./landing-press.module.css";

/** Báo chí và truyền hình: bản tin đầu tiên đặt lớn trong khung màn hình trên nền tối, các tin còn lại xếp lưới bên dưới. */
export function LandingPressSection({ images }: { images: readonly LandingImage[] }) {
  const [lead, ...rest] = images;
  if (!lead) return null;
  return (
    <section id="bao-chi" className={s.press} aria-labelledby="press-title">
      <div className={site.wrap}>
        <div className={s.lead}>
          <div className={s.words}>
            <h2 id="press-title">Báo chí và truyền hình</h2>
            <p className={s.name}><CooperativeName /> trên sóng truyền hình và mặt báo.</p>
            {lead.caption ? <p className={s.headline}>{lead.caption}</p> : null}
            <a className={s.open} href={lead.url} target="_blank" rel="noopener noreferrer">Xem ảnh cỡ lớn</a>
          </div>
          <figure className={s.screen}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ HTX đăng, qua proxy ảnh công khai */}
            <img src={lead.url} alt={lead.caption || "Bản tin về hợp tác xã"} loading="lazy" />
          </figure>
        </div>
        {rest.length ? (
          <ul className={s.more}>
            {rest.map((item) => (
              <li key={item.url}>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ HTX đăng, qua proxy ảnh công khai */}
                  <img src={item.url} alt={item.caption || "Bài báo về hợp tác xã"} loading="lazy" />
                  {item.caption ? <span>{item.caption}</span> : null}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
