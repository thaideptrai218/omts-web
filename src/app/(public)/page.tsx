import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { traceExample } from "@/features/landing/landing-example";
import { LandingPage } from "@/features/landing/landing-page";
import { sessionCookieNames } from "@/server/auth/session-cookie-names";
import { getCooperativeBrand } from "@/server/public/cooperative-brand";
import { fetchLandingData } from "@/server/public/landing-page-fetch";
import { fetchProvenancePage } from "@/server/public/origin-page-fetch";

// Tên hợp tác xã trong tiêu đề và mô tả lấy từ hồ sơ HTX (Thiết lập).
export async function generateMetadata(): Promise<Metadata> {
  const { fullName } = await getCooperativeBrand();
  return {
    title: { absolute: `${fullName} · Nuôi hàu minh bạch từng lô` },
    description: `Xem nguồn gốc hàu của ${fullName} bằng mã QR: vùng nuôi, ngày thả giống và ngày thu hoạch.`,
  };
}

/** Ảnh và dữ liệu đổi được trong Cài đặt nên đọc theo từng yêu cầu (đường dẫn ảnh có hạn dùng). */
async function LiveLandingPage() {
  await connection();
  const requestHeaders = await headers();
  // Chỉ để đổi nhãn nút: quyền vẫn do khu làm việc kiểm tra.
  const profile = process.env.OMTS_WEB_COOKIE_PROFILE;
  const signedIn = (profile === "https" || profile === "http-loopback-dev") && (await cookies()).has(sessionCookieNames(profile).access);
  const data = await fetchLandingData(requestHeaders);
  const token = data?.featuredQrToken ?? null;
  const result = token ? await fetchProvenancePage(token, process.env, fetch, requestHeaders) : null;
  return <LandingPage data={data} signedIn={signedIn} example={traceExample(result?.status === "ok" ? result.page : null, token)} />;
}

export default function Home() {
  return (
    <Suspense fallback={<LandingPage data={null} example={traceExample(null, null)} />}>
      <LiveLandingPage />
    </Suspense>
  );
}
