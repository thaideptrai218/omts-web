import type { Metadata } from "next";
import { LandingPage } from "@/features/landing/landing-page";

export const metadata: Metadata = {
  title: "OMTS · HTX Trung Nam, nuôi hàu minh bạch từng lô",
  description: "Hệ thống quản lý nuôi hàu, bán hàng, công nợ và truy xuất nguồn gốc bằng mã QR của hợp tác xã Trung Nam, Vân Đồn, Quảng Ninh.",
};

export default function Home() {
  return <LandingPage />;
}
