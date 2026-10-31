import type { Metadata } from "next";
import { LoginExperience } from "@/features/auth/components/login-experience";
import { Suspense } from "react";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { ApiLoginEntry } from "@/features/auth/components/api-login-entry";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Đăng nhập | OMTS",
};

async function LoginContent() {
  await connection();
  if (getSessionGateway().mode !== "mock") {
    return <Suspense fallback={<p role="status">Đang kiểm tra phiên đăng nhập...</p>}><ApiLoginEntry /></Suspense>;
  }
  return (
    <section
      aria-labelledby="login-title"
      className="rounded-card border border-border bg-surface p-6 shadow-card sm:p-8"
    >
      <p className="text-sm font-semibold text-primary">Chào mừng trở lại</p>
      <h1 id="login-title" className="mt-2 text-3xl font-semibold tracking-tight text-text">
        Đăng nhập OMTS
      </h1>
      <p className="mt-3 text-base leading-7 text-text-muted">
        Dùng tài khoản của bạn để tiếp tục vào khu vực làm việc.
      </p>
      <LoginExperience />
    </section>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<p role="status">Đang tải trang đăng nhập...</p>}><LoginContent /></Suspense>;
}
