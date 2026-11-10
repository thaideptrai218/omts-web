import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { LandingPage } from "@/features/landing/landing-page";

// Phông có bộ dấu tiếng Việt đầy đủ cho trang giới thiệu.
const landingFont = Be_Vietnam_Pro({ subsets: ["vietnamese", "latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-landing", display: "swap" });

export const metadata: Metadata = {
  title: "OMTS · HTX Trung Nam, nuôi hàu minh bạch từng lô",
  description: "Hệ thống quản lý nuôi hàu, bán hàng, công nợ và truy xuất nguồn gốc bằng mã QR của hợp tác xã Trung Nam, Vân Đồn, Quảng Ninh.",
};

export default function Home() {
  return <div className={landingFont.variable}><LandingPage /></div>;
}
