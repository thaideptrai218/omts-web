import type { Metadata } from "next";
import { LoginExperience } from "@/features/auth/components/login-experience";
import { Suspense } from "react";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { ApiLoginEntry } from "@/features/auth/components/api-login-entry";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Đăng nhập | HTX Trung Nam",
};

async function LoginContent() {
  await connection();
  if (getSessionGateway().mode !== "mock") {
    return <Suspense fallback={<p role="status">Đang kiểm tra phiên đăng nhập...</p>}><ApiLoginEntry /></Suspense>;
  }
  return (
    <section
      aria-labelledby="login-title"
      className="login-panel"
    >
      <p className="login-eyebrow">CHÀO MỪNG TRỞ LẠI</p>
      <h1 id="login-title" className="login-title">
        Đăng nhập hệ thống
      </h1>
      <p className="login-description">
        Đăng nhập để quản lý hoạt động nuôi hàu, mua bán và thông tin truy xuất nguồn gốc.
      </p>
      <LoginExperience />
    </section>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<p role="status">Đang tải trang đăng nhập...</p>}><LoginContent /></Suspense>;
}
