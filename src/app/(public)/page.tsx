import type { Metadata } from "next";
import { LandingPage } from "@/features/landing/landing-page";
import { getCooperativeBrand } from "@/server/public/cooperative-brand";

// Tên hợp tác xã trong tiêu đề và mô tả lấy từ hồ sơ HTX (Thiết lập).
export async function generateMetadata(): Promise<Metadata> {
  const { fullName } = await getCooperativeBrand();
  return {
    title: { absolute: `OMTS · ${fullName}, nuôi hàu minh bạch từng lô` },
    description: `Hệ thống quản lý nuôi hàu, bán hàng, công nợ và truy xuất nguồn gốc bằng mã QR của ${fullName}.`,
  };
}

export default function Home() {
  return <LandingPage />;
}
