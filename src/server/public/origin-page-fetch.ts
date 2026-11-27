import "server-only";
import { parseServerBackendConfig } from "@/server/config/backend-config";
import { readBoundedBody } from "./origin-bounded-body";
import { originClientHeaders } from "./origin-client-headers";
import { problemSchema, provenancePageSchema, type ProvenancePage } from "./origin-page-schema";
import { resolvePhotoSource } from "./origin-photo-source";
import { parseQrToken } from "./origin-qr-token";

const MAX_PAGE_BYTES = 1_048_576;

export type OriginFetchResult =
  | Readonly<{ status: "ok"; page: ProvenancePage }>
  | Readonly<{ status: "invalid-token" }>
  | Readonly<{ status: "not-found"; message: string | null }>
  | Readonly<{ status: "rate-limited" }>
  | Readonly<{ status: "unavailable" }>;

/** Đổi ảnh sang nguồn an toàn (ảnh không dùng được bị loại); bỏ các URL không hiển thị để không rò rỉ sang trình duyệt. */
function withSafePhotos(page: ProvenancePage, origin: string, environment: Readonly<Record<string, unknown>>): ProvenancePage {
  const safe = (urls: string[]) => urls.flatMap((raw) => resolvePhotoSource(raw, origin, environment) ?? []);
  return {
    ...page,
    // Logo và ảnh bìa là dữ liệu công khai của HTX (hồ sơ trong Thiết lập) và đi qua proxy ảnh; tệp chứng nhận thì chưa công khai nên vẫn bị loại.
    cooperative: {
      ...page.cooperative,
      logoUrl: page.cooperative.logoUrl ? resolvePhotoSource(page.cooperative.logoUrl, origin, environment) : null,
      coverPhotoUrl: page.cooperative.coverPhotoUrl ? resolvePhotoSource(page.cooperative.coverPhotoUrl, origin, environment) : null,
      certifications: page.cooperative.certifications.map((c) => ({ ...c, fileUrl: null })),
    },
    lots: page.lots.map((lot) => lot.origin
      ? { ...lot, origin: { ...lot.origin, harvestPhotoUrls: safe(lot.origin.harvestPhotoUrls), raftPhotoUrls: safe(lot.origin.raftPhotoUrls) } }
      : lot),
    productDetails: page.productDetails?.map((product) => ({ ...product, photoUrls: safe(product.photoUrls) })),
  };
}

async function discard(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => undefined);
}

async function readNotFoundMessage(response: Response): Promise<string | null> {
  const body = await readBoundedBody(response, 16_384);
  if (!body) return null;
  try {
    const parsed = problemSchema.safeParse(JSON.parse(new TextDecoder().decode(body)));
    return parsed.success ? parsed.data.detail ?? null : null;
  } catch { return null; }
}

/**
 * Gọi GET api/public/provenance/{qrToken} từ máy chủ. Không chuyển tiếp cookie hay header của người dùng,
 * không theo chuyển hướng, không cache (dữ liệu luôn là hiện tại, BR-TRACE-05).
 */
export async function fetchProvenancePage(
  rawToken: unknown,
  environment: Readonly<Record<string, unknown>> = process.env,
  fetcher: typeof fetch = fetch,
  requestHeaders?: Headers,
): Promise<OriginFetchResult> {
  const token = parseQrToken(rawToken);
  if (!token) return { status: "invalid-token" };
  const parsedConfig = parseServerBackendConfig(environment);
  if (parsedConfig.status !== "valid" || parsedConfig.config.source !== "api") return { status: "unavailable" };
  const { origin, timeoutMs } = parsedConfig.config;
  try {
    const url = new URL(`/api/public/provenance/${token}`, origin);
    if (url.origin !== origin) return { status: "unavailable" };
    const response = await fetcher(url, {
      // Chuyển IP khách (kèm secret của BFF) để giới hạn lượt tính theo từng khách, không dồn mọi khách vào một bucket.
      method: "GET", headers: { Accept: "application/json", ...originClientHeaders(requestHeaders, environment) }, credentials: "omit",
      redirect: "error", cache: "no-store", signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 404) return { status: "not-found", message: await readNotFoundMessage(response) };
    if (response.status === 429) { await discard(response); return { status: "rate-limited" }; }
    if (response.status !== 200 || !(response.headers.get("content-type") ?? "").toLowerCase().includes("json")) {
      await discard(response);
      return { status: "unavailable" };
    }
    const body = await readBoundedBody(response, MAX_PAGE_BYTES);
    if (!body) return { status: "unavailable" };
    const parsed = provenancePageSchema.safeParse(JSON.parse(new TextDecoder().decode(body)));
    return parsed.success ? { status: "ok", page: withSafePhotos(parsed.data, origin, environment) } : { status: "unavailable" };
  } catch {
    // Không ném lại lỗi gốc: tránh lộ origin backend ra giao diện.
    return { status: "unavailable" };
  }
}
