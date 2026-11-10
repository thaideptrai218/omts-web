import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { connection } from "next/server";
import { cache } from "react";
import { originCopy } from "@/features/origin-page/origin-copy";
import { OriginPageView } from "@/features/origin-page/origin-page-view";
import { OriginStatePanel } from "@/features/origin-page/origin-state-panel";
import { fetchProvenancePage } from "@/server/public/origin-page-fetch";
import { parseOriginLanguage, parseQrToken } from "@/server/public/origin-qr-token";

const originFont = Be_Vietnam_Pro({ subsets: ["vietnamese", "latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-origin", display: "swap" });

// Mã QR là bí mật bán công khai: không cho công cụ tìm kiếm lập chỉ mục hay lưu bản sao.
const robots = { index: false, follow: false, nocache: true } as const;

// Dữ liệu luôn là hiện tại (BR-TRACE-05): fetch không cache giữa các yêu cầu; cache() chỉ gộp generateMetadata và trang
// thành MỘT lần gọi backend trong cùng một yêu cầu (backend giới hạn lượt gọi theo IP).
const getProvenance = cache((qrToken: string, language: "vi" | "en") => fetchProvenancePage(qrToken, language));

export async function generateMetadata({ params, searchParams }: PageProps<"/origin/[qrToken]">): Promise<Metadata> {
  const { qrToken } = await params;
  const language = parseOriginLanguage((await searchParams).lang);
  const copy = originCopy(language);
  // Chỉ gọi backend khi mã QR hợp lệ; lô đầu tiên đang hiệu lực làm tiêu đề.
  const result = parseQrToken(qrToken) ? await getProvenance(qrToken, language) : null;
  const lot = result?.status === "ok" ? result.page.lots.find((l) => l.originState === "Published") : undefined;
  return {
    title: lot ? `${copy.metaTitleLot(lot.lotCode)} · HTX Trung Nam` : `${copy.metaTitle} · HTX Trung Nam`,
    description: copy.metaDescription,
    robots,
    referrer: "no-referrer",
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
