import Link from "next/link";
import type { TraceExample } from "./landing-example";
import { SampleQr } from "./landing-sample-qr";
import s from "./landing-example-card.module.css";

/** Thẻ "hộ chiếu" của một lô hàu: ảnh sản phẩm, giới thiệu, mốc nuôi và ảnh của lô. Cả thẻ bấm được. */
export function LandingExampleCard({ example }: { example: TraceExample }) {
  return (
    <Link className={s.card} href={example.href}>
      <span className={s.cover}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh sản phẩm qua proxy ảnh công khai */}
        <img src={example.photo} alt={`Ảnh ${example.product}`} />
        <span className={s.status}>Nguồn gốc đã được công bố</span>
        <span className={s.qr}><SampleQr /></span>
      </span>
      <span className={s.body}>
        <strong className={s.name}>{example.product}</strong>
        <span className={s.lot}>Lô {example.lot}</span>
        {example.description ? <span className={s.description}>{example.description}</span> : null}
        <span className={s.facts}>
          {example.facts.map(([label, value]) => <span key={label}><small>{label}</small><b>{value}</b></span>)}
        </span>
        {example.certificates.length ? (
          <span className={s.certs}>
            {example.certificates.map((cert) => <span key={cert.number}><small>{cert.name}</small><b>Số {cert.number}</b></span>)}
          </span>
        ) : null}
        {example.thumbs.length ? (
          <span className={s.thumbs}>
            {example.thumbs.map((src, index) => (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh của lô qua proxy ảnh công khai
              <img key={src} src={src} alt={`Ảnh ${index + 1} của lô`} />
            ))}
          </span>
        ) : null}
        <span className={s.more}>{example.real ? "Xem đầy đủ hành trình của lô" : "Thẻ minh họa. Xem trang mẫu"}</span>
      </span>
    </Link>
  );
}
