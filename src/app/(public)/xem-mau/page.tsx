import type { Metadata } from "next";
import { OriginPageView } from "@/features/origin-page/origin-page-view";
import { samplePage } from "@/features/origin-page/origin-sample";
import { getCooperativeBrand } from "@/server/public/cooperative-brand";

export const metadata: Metadata = { title: "Trang truy xuất mẫu", robots: { index: false, follow: false } };

/** Trang truy xuất mẫu: đúng giao diện thật, dữ liệu và ảnh minh họa, không gọi dữ liệu bán hàng. */
export default async function SampleOriginPage() {
  const { fullName } = await getCooperativeBrand();
  return (
    <OriginPageView
      page={samplePage(fullName)}
      sampleNotice="Đây là trang mẫu: dữ liệu và ảnh chỉ để minh họa, không phải lô hàu thật."
    />
  );
}
