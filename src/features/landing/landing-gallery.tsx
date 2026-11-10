import Image from "next/image";
import { landingPhotos } from "./landing-content";
import b from "./landing.module.css";
import s from "./landing-gallery.module.css";

/**
 * Ảnh thực tế của hợp tác xã. Chỉ hiện khi `landingPhotos` có ảnh, nên trang không bao giờ chứa ảnh giả
 * hay ảnh không rõ nguồn. Cách thêm ảnh: xem chú thích trong landing-content.ts.
 */
export function LandingGallery() {
  if (!landingPhotos.length) return null;
  return (
    <section className={s.gallery} aria-labelledby="gallery-title">
      <div className={b.wrap}>
        <div className={`${s.head} ${b.reveal}`}>
          <span className={b.kicker}>Tại vùng nuôi</span>
          <h2 id="gallery-title" className={b.h2}>Hình ảnh thực tế từ HTX Trung Nam</h2>
        </div>
        <div className={s.grid}>
          {landingPhotos.map((p, i) => (
            <figure key={p.src} className={`${s.shot} ${i === 0 ? s.lead : ""} ${b.reveal}`}>
              <Image src={p.src} alt={p.alt} fill sizes={i === 0 ? "(min-width: 900px) 66vw, 100vw" : "(min-width: 900px) 33vw, 100vw"} className={s.img} />
              <figcaption>{p.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
