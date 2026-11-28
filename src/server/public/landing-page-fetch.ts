import "server-only";
import { z } from "zod";
import { parseServerBackendConfig } from "@/server/config/backend-config";
import { originClientHeaders } from "./origin-client-headers";
import { productDetailSchema, provenancePageSchema } from "./origin-page-schema";
import { resolvePhotoSource } from "./origin-photo-source";

// Dữ liệu công khai của trang giới thiệu (GET api/public/landing): hợp tác xã, ảnh do chủ HTX đăng, sản phẩm đang bán.
const landingSchema = z.object({
  cooperative: provenancePageSchema.shape.cooperative,
  photos: z.array(z.object({ section: z.enum(["Background", "Press", "Gallery"]), caption: z.string().max(300).nullish(), url: z.string().max(2048) })).max(40),
  products: z.array(productDetailSchema).max(100),
  featuredQrToken: z.string().max(64).nullish(),
});

export type LandingData = z.infer<typeof landingSchema>;

/** Trả null khi chưa đọc được: trang giới thiệu vẫn hiện bằng ảnh mặc định. */
export async function fetchLandingData(requestHeaders: Headers, environment: Readonly<Record<string, unknown>> = process.env): Promise<LandingData | null> {
  const config = parseServerBackendConfig(environment);
  if (config.status !== "valid" || config.config.source !== "api") return null;
  const { origin, timeoutMs } = config.config;
  try {
    const response = await fetch(new URL("/api/public/landing", origin), {
      method: "GET", headers: { Accept: "application/json", ...originClientHeaders(requestHeaders, environment) }, credentials: "omit",
      redirect: "error", cache: "no-store", signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status !== 200) { await response.body?.cancel().catch(() => undefined); return null; }
    const parsed = landingSchema.safeParse(await response.json());
    if (!parsed.success) return null;
    const data = parsed.data;
    // Trình duyệt không biết origin backend: mọi ảnh đi qua proxy ảnh công khai.
    const safe = (raw: string) => resolvePhotoSource(raw, origin, environment);
    return {
      ...data,
      cooperative: {
        ...data.cooperative,
        // Chỉ giấy chứng nhận dạng ảnh mới hiện được; tệp PDF không đi qua proxy ảnh.
        certifications: data.cooperative.certifications.map((c) => ({ ...c, fileUrl: c.fileUrl && /\.(jpg|png|webp)(\?|$)/u.test(c.fileUrl) ? safe(c.fileUrl) : null })),
      },
      photos: data.photos.flatMap((photo) => { const url = safe(photo.url); return url ? [{ ...photo, url }] : []; }),
      products: data.products.map((product) => ({ ...product, photoUrls: product.photoUrls.flatMap((raw) => safe(raw) ?? []) })),
    };
  } catch {
    return null;
  }
}
