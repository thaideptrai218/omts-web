import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { headers } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { originCopy } from "@/features/origin-page/origin-copy";
import { OriginPageView } from "@/features/origin-page/origin-page-view";
import { OriginStatePanel } from "@/features/origin-page/origin-state-panel";
import { getCooperativeBrand } from "@/server/public/cooperative-brand";
import { fetchProvenancePage } from "@/server/public/origin-page-fetch";
import { parseOriginLanguage, parseQrToken } from "@/server/public/origin-qr-token";

const originFont = Be_Vietnam_Pro({ subsets: ["vietnamese", "latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-origin", display: "swap" });

// Mã QR là bí mật bán công khai: không cho công cụ tìm kiếm lập chỉ mục hay lưu bản sao.
const robots = { index: false, follow: false, nocache: true } as const;

// Dữ liệu luôn là hiện tại (BR-TRACE-05): fetch không cache giữa các yêu cầu; cache() chỉ gộp generateMetadata và trang
// thành MỘT lần gọi backend trong cùng một yêu cầu (backend giới hạn lượt gọi theo IP).
// Header của yêu cầu được chuyển cho backend (IP khách + secret BFF) để giới hạn lượt tính theo từng khách.
const getProvenance = cache(async (qrToken: string, language: "vi" | "en") =>
  fetchProvenancePage(qrToken, language, process.env, fetch, await headers()));

export async function generateMetadata({ params, searchParams }: PageProps<"/origin/[qrToken]">): Promise<Metadata> {
  const { qrToken } = await params;
  const language = parseOriginLanguage((await searchParams).lang);
  const copy = originCopy(language);
  // Chỉ gọi backend khi mã QR hợp lệ; lô đầu tiên đang hiệu lực làm tiêu đề.
  const result = parseQrToken(qrToken) ? await getProvenance(qrToken, language) : null;
  const lot = result?.status === "ok" ? result.page.lots.find((l) => l.originState === "Published") : undefined;
  // Tên HTX lấy từ hồ sơ HTX do API trả (khối cooperative của trang); không gõ cứng. Mẫu tiêu đề của root layout thêm " | tên HTX".
  const cooperativeName = result?.status === "ok" ? result.page.cooperative.fullName : (await getCooperativeBrand()).fullName;
  const title = lot ? copy.metaTitleLot(lot.lotCode) : copy.metaTitle;
  const description = copy.metaDescription(cooperativeName);
  // Ảnh xem trước khi dán liên kết vào Zalo/Messenger: ảnh bìa HTX, không có thì logo; cả hai lấy từ hồ sơ HTX qua proxy ảnh (đường dẫn ổn định, không ký).
  const brandImage = result?.status === "ok" ? result.page.cooperative.coverPhotoUrl ?? result.page.cooperative.logoUrl ?? null : null;
  const socialTitle = `${title} | ${cooperativeName}`;
  // Ảnh xem trước cần URL tuyệt đối: lấy origin của chính yêu cầu này (chỉ nhận host hợp lệ, không tin chuỗi lạ).
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") === "https" ? "https" : "http";
  const metadataBase = host && /^[A-Za-z0-9.-]{1,253}(?::\d{1,5})?$/u.test(host) ? new URL(`${protocol}://${host}`) : undefined;
  return {
    metadataBase,
    title,
    description,
    robots,
    referrer: "no-referrer",
    openGraph: { title: socialTitle, description, siteName: cooperativeName, type: "website", ...(brandImage ? { images: [{ url: brandImage, alt: cooperativeName }] } : {}) },
    twitter: { card: brandImage ? "summary_large_image" : "summary", title: socialTitle, description, ...(brandImage ? { images: [brandImage] } : {}) },
  };
}

export default async function OriginPage({ params, searchParams }: PageProps<"/origin/[qrToken]">) {
  await connection();
  const { qrToken } = await params;
  const language = parseOriginLanguage((await searchParams).lang);
  const result = await getProvenance(qrToken, language);
  const copy = originCopy(language);
  const retryHref = `/origin/${encodeURIComponent(qrToken)}${language === "en" ? "?lang=en" : ""}`;
  return (
    <div className={originFont.variable}>
      {result.status === "ok" ? (
        <OriginPageView page={result.page} langHrefs={{ vi: `/origin/${qrToken}`, en: `/origin/${qrToken}?lang=en` }} />
      ) : (
        <OriginStatePanel
          problem={result.status} language={language} copy={copy} retryHref={retryHref}
          backendMessage={result.status === "not-found" ? result.message : null}
        />
      )}
    </div>
  );
}
