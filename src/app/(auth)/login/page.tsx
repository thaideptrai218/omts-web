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
      className="login-panel"
    >
      <p className="login-eyebrow">KHÔNG GIAN LÀM VIỆC OMTS</p>
      <h1 id="login-title" className="login-title">
        Đăng nhập OMTS
      </h1>
      <p className="login-description">
        Dùng tài khoản của bạn để tiếp tục vào khu vực làm việc.
      </p>
      <LoginExperience />
    </section>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<p role="status">Đang tải trang đăng nhập...</p>}><LoginContent /></Suspense>;
}
