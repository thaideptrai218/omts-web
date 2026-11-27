import { Be_Vietnam_Pro } from "next/font/google";

// Phông chữ chung của trang giới thiệu và trang truy xuất nguồn gốc (khai báo ở đây để thành phần không phụ thuộc next/font).
const publicFont = Be_Vietnam_Pro({ subsets: ["vietnamese", "latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-public", display: "swap" });

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className={publicFont.variable}>{children}</div>;
}
