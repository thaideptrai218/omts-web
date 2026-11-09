"use client";
import { claimPhotoSrc } from "./claim-labels";
import s from "./claims.module.css";

type Props = { area: "claim-reports" | "quality-claims"; claimId: string; claimCode: string; count: number };

/** Ảnh đính kèm của một khiếu nại: ảnh riêng tư nên đi qua BFF (cần đăng nhập); bấm để xem ảnh đầy đủ ở thẻ mới. */
export function ClaimPhotoGrid({ area, claimId, claimCode, count }: Props) {
  if (count < 1) return <p className={s.muted}>Khiếu nại không có ảnh đính kèm.</p>;
  return (
    <ul className={s.photos} aria-label={`Ảnh đính kèm của khiếu nại ${claimCode}`}>
      {Array.from({ length: count }, (_, index) => {
        const src = claimPhotoSrc(area, claimId, index);
        return (
          <li key={index}>
            <a className={s.thumb} href={src} target="_blank" rel="noopener noreferrer" aria-label={`Xem ảnh ${index + 1} trong ${count} ảnh`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh riêng tư lấy qua BFF có cookie phiên, không đi qua trình tối ưu ảnh của Next */}
              <img src={src} alt={`Ảnh ${index + 1} của khiếu nại ${claimCode}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
