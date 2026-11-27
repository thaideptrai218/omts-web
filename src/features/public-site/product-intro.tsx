import type { ProductDetail } from "@/server/public/origin-page-schema";
import s from "./product-intro.module.css";

const size = ({ sizeMinCm: min, sizeMaxCm: max }: ProductDetail) => (min == null ? null : max == null ? `${min} cm` : `${min} đến ${max} cm`);

/** Thẻ giới thiệu một sản phẩm từ danh mục; dùng ở trang giới thiệu và trang truy xuất. */
export function ProductIntro({ product, fallbackPhoto, facts = [] }: { product: ProductDetail; fallbackPhoto?: string; facts?: readonly (readonly [string, string])[] }) {
  const photos = product.photoUrls.length ? product.photoUrls : fallbackPhoto ? [fallbackPhoto] : [];
  const label = size(product);
  const rows = [...(label ? [["Cỡ vỏ", label] as const] : []), ...facts];
  return (
    <article className={s.product}>
      {photos[0] ? (
        <figure className={s.main}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh sản phẩm qua proxy ảnh công khai */}
          <img src={photos[0]} alt={`Ảnh ${product.name}`} loading="lazy" />
          {product.photoUrls.length === 0 ? <figcaption>Ảnh minh họa</figcaption> : null}
        </figure>
      ) : null}
      <div className={s.body}>
        <h3>{product.name}</h3>
        {product.description ? <p>{product.description}</p> : null}
        {rows.length ? (
          <dl className={s.facts}>
            {rows.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}
          </dl>
        ) : null}
        {photos.length > 1 ? (
          <ul>
            {photos.slice(1, 5).map((src, index) => (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh sản phẩm qua proxy ảnh công khai
              <li key={src}><img src={src} alt={`Ảnh ${product.name} ${index + 2}`} loading="lazy" /></li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
