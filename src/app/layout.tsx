import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import { BootScreen } from "@/components/feedback/boot-screen";
import { ToastProvider } from "@/components/ui/toast-provider";
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

export const metadata: Metadata = {
  title: "HTX Nuôi trồng Thủy sản Trung Nam",
  description: "Quản lý nuôi hàu, hoạt động hợp tác xã và truy xuất nguồn gốc sản phẩm.",
};

async function RequestAuthProvider({ children }: { children: ReactNode }) {
  await connection();
  return <AuthProvider enabled={getSessionGateway().mode === "mock"}>{children}</AuthProvider>;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${appSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <Suspense fallback={<BootScreen message="Đang tải hệ thống quản lý HTX..." />}>
            <RequestAuthProvider>{children}</RequestAuthProvider>
          </Suspense>
        </ToastProvider>
      </body>
    </html>
  );
}
