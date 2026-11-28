import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { CooperativeName } from "@/components/brand/cooperative-name-context";
import { PublicFrame } from "@/features/public-site/public-frame";
import site from "@/features/public-site/public-site.module.css";
import type { OriginCopy } from "./origin-copy";

type Props = {
  copy: OriginCopy;
  /** Tên và logo của HTX từ hồ sơ HTX (logo đã qua proxy ảnh). Không có thì dùng nhận diện chung của ứng dụng. */
  brand?: Readonly<{ name: string; logoUrl: string | null }>;
  children: ReactNode;
};

/** Khung trang truy xuất: cùng khung với trang giới thiệu. */
export function OriginPageShell({ copy, brand, children }: Props) {
  const mark = brand ? (
    <Link href="/" className={site.brand}>
      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo qua proxy ảnh của trang công khai, không đi qua trình tối ưu ảnh của Next
        <img className={site.brandLogo} src={brand.logoUrl} alt="" width={36} height={36} decoding="async" referrerPolicy="no-referrer" />
      ) : null}
      <span className={site.brandName}>{brand.name}</span>
    </Link>
  ) : <Link href="/" className={site.brand}><BrandMark compact /></Link>;
  return (
    <PublicFrame
      lang="vi" skipLabel={copy.skip} headerLabel={copy.headerLabel} brand={mark}
      footer={<p><strong>{brand ? brand.name : <CooperativeName />}</strong>{copy.footer}</p>}
    >
      {children}
    </PublicFrame>
  );
}
