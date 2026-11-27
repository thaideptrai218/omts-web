import Link from "next/link";
import { SAMPLE_PATH } from "@/features/origin-page/origin-sample";
import { formatOriginDate } from "@/features/origin-page/origin-format";
import { ProductIntro } from "@/features/public-site/product-intro";
import site from "@/features/public-site/public-site.module.css";
import type { LandingData } from "@/server/public/landing-page-fetch";
import { defaultImages, type LandingImage } from "./landing-content";
import type { TraceExample } from "./landing-example";
import s from "./landing-showcase.module.css";

const CERT_STATE = { Valid: "Còn hiệu lực", ExpiringSoon: "Sắp hết hạn", Expired: "Đã hết hạn" } as const;

function Photo({ image, className }: { image: LandingImage; className?: string }) {
  return (
    <figure className={`${s.photo} ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ HTX đăng, đi qua proxy ảnh công khai */}
      <img src={image.url} alt={image.caption} loading="lazy" />
      {image.caption ? <figcaption>{image.caption}</figcaption> : null}
    </figure>
  );
}

/** Giới thiệu sản phẩm, lấy từ danh mục sản phẩm (mô tả, cỡ, ảnh); không có giá. */
export function LandingProductsSection({ products, example }: { products: LandingData["products"]; example: TraceExample }) {
  if (products.length === 0) return null;
  // Thông tin nuôi lấy từ lô mẫu, chỉ ghi cho sản phẩm bán ra từ chính lô đó.
  const factsOf = (name: string): (readonly [string, string])[] => {
    const { seed } = example;
    if (!seed || !example.lotProducts.includes(name)) return [];
    return [
      ["Con giống", seed.itemName],
      ["Vùng nuôi", seed.zone],
      ...(seed.days == null ? [] : [["Thời gian nuôi", `${seed.days} ngày (lô ${example.lot})`] as const]),
    ];
  };
  return (
    <section id="san-pham" className={`${s.section} ${s.white}`} aria-labelledby="products-title">
      <div className={site.wrap}>
        <h2 id="products-title" className={site.heading}>Sản phẩm của hợp tác xã</h2>
        <div className={s.products}>
          {products.map((product) => <ProductIntro key={product.name} product={product} fallbackPhoto={defaultImages.product} facts={factsOf(product.name)} />)}
        </div>
      </div>
    </section>
  );
}

/** Hình ảnh vùng nuôi và lối vào trang truy xuất. */
export function LandingTraceGallerySection({ images, exampleHref }: { images: readonly LandingImage[]; exampleHref: string }) {
  return (
    <section id="xem-mau" className={s.section} aria-labelledby="sample-title">
      <div className={site.wrap}>
        <div className={s.head}>
          <div>
            <h2 id="sample-title" className={site.heading}>Xem thử một trang truy xuất</h2>
            <p className={site.sub}>Đây là những gì người mua thấy sau khi quét mã: lô hàu, hành trình theo ngày, vị trí bè và hình ảnh.</p>
          </div>
          <div className={s.headActions}>
            <Link className={site.button} href={exampleHref}>Mở trang truy xuất</Link>
            {exampleHref === SAMPLE_PATH ? null : <Link className={site.buttonGhost} href={SAMPLE_PATH}>Xem trang mẫu</Link>}
          </div>
        </div>
        <div className={images.length >= 3 ? s.mosaic : s.row}>
          {images.map((image) => <Photo key={image.url} image={image} />)}
        </div>
      </div>
    </section>
  );
}

export function LandingCertificationsSection({ certifications }: { certifications: LandingData["cooperative"]["certifications"] }) {
  if (certifications.length === 0) return null;
  return (
    <section id="chung-nhan" className={`${s.section} ${s.white}`} aria-labelledby="cert-title">
      <div className={site.wrap}>
        <h2 id="cert-title" className={site.heading}>Giấy chứng nhận</h2>
        <ul className={s.certs}>
          {certifications.map((cert) => (
            <li key={`${cert.name}-${cert.number ?? ""}`}>
              {cert.fileUrl ? (
                <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer" className={s.certImage}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- ảnh giấy chứng nhận qua proxy ảnh công khai */}
                  <img src={cert.fileUrl} alt={`Ảnh ${cert.name}`} loading="lazy" />
                </a>
              ) : null}
              <strong>{cert.name}</strong>
              {cert.number ? <span>Số {cert.number}</span> : null}
              {cert.issuer ? <span>Nơi cấp: {cert.issuer}</span> : null}
              <span className={site.chip}>{CERT_STATE[cert.state]}{cert.expiryDate ? ` đến ${formatOriginDate(cert.expiryDate)}` : ""}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
