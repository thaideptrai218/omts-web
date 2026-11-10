import { ExternalIcon } from "./origin-icons";
import type { OriginCopy } from "./origin-copy";
import s from "./origin-lot.module.css";

type Props = { heading: string; kind: string; lotCode: string; photos: readonly string[]; copy: OriginCopy };

/** Lưới ảnh tải lười; src đã được máy chủ kiểm tra (proxy nội bộ hoặc https tuyệt đối). */
export function OriginLotGallery({ heading, kind, lotCode, photos, copy }: Props) {
  if (photos.length === 0) return null;
  return (
    <section className={s.gallery} aria-label={`${heading} (${photos.length})`}>
      <h4 className={s.galleryTitle}>{heading}</h4>
      <ul className={s.photoGrid}>
        {photos.map((src, index) => {
          const alt = copy.photoOf(kind, lotCode, index + 1, photos.length);
          return (
            <li key={src} className={s.photoItem}>
              <a className={s.photoLink} href={src} target="_blank" rel="noopener noreferrer" aria-label={`${copy.openPhoto}: ${alt}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- ảnh đã ký, hết hạn sau 1 giờ, không đi qua trình tối ưu ảnh của Next */}
                <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" width={400} height={300} />
                <span className={s.photoHint} aria-hidden="true"><ExternalIcon /></span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
