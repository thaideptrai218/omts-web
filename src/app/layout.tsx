import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BootScreen } from "@/components/feedback/boot-screen";
import { ToastProvider } from "@/components/ui/toast-provider";
import { AuthProvider } from "@/features/auth/state/auth-provider";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
