import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import { BootScreen } from "@/components/feedback/boot-screen";
import { CooperativeNameProvider } from "@/components/brand/cooperative-name-context";
import { ToastProvider } from "@/components/ui/toast-provider";
import { getCooperativeBrand } from "@/server/public/cooperative-brand";
import { AuthProvider } from "@/features/auth/state/auth-provider";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import "./globals.css";

// Phông có bộ dấu tiếng Việt đầy đủ cho toàn ứng dụng (Geist không có tập con tiếng Việt nên chữ có dấu bị ghép từ phông hệ thống).
const appSans = Be_Vietnam_Pro({
  variable: "--font-app-sans",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Tên HTX trong tiêu đề tab lấy từ hồ sơ HTX; các trang chỉ đặt phần đầu ("Vùng nuôi"), mẫu thêm " | tên HTX".
export async function generateMetadata(): Promise<Metadata> {
  const { fullName } = await getCooperativeBrand();
  return {
    title: { default: fullName, template: `%s | ${fullName}` },
    description: "Quản lý nuôi hàu, hoạt động hợp tác xã và truy xuất nguồn gốc sản phẩm.",
  };
}

async function RequestAuthProvider({ children }: { children: ReactNode }) {
  await connection();
  return <AuthProvider enabled={getSessionGateway().mode === "mock"}>{children}</AuthProvider>;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const brand = await getCooperativeBrand();
  return (
    <html
      lang="vi"
      className={`${appSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CooperativeNameProvider name={brand.fullName}>
          <ToastProvider>
            <Suspense fallback={<BootScreen message="Đang tải hệ thống quản lý HTX..." />}>
              <RequestAuthProvider>{children}</RequestAuthProvider>
            </Suspense>
          </ToastProvider>
        </CooperativeNameProvider>
      </body>
    </html>
  );
}
