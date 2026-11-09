import "server-only";
import { parseServerBackendConfig } from "@/server/config/backend-config";
import { readBoundedBody } from "./origin-bounded-body";
import { backendPhotoUrl } from "./origin-photo-source";

const MAX_PHOTO_BYTES = 8 * 1_048_576;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type OriginPhotoResult =
  | Readonly<{ status: "ok"; body: Uint8Array; contentType: string }>
  | Readonly<{ status: "bad-request" | "not-found" | "unavailable" }>;

/** Lấy ảnh đã ký từ backend cho trình duyệt; chỉ cùng origin backend, chỉ jpeg/png/webp, có giới hạn dung lượng. */
export async function fetchOriginPhoto(
  searchParams: URLSearchParams,
  environment: Readonly<Record<string, unknown>> = process.env,
  fetcher: typeof fetch = fetch,
): Promise<OriginPhotoResult> {
  const parsedConfig = parseServerBackendConfig(environment);
  if (parsedConfig.status !== "valid" || parsedConfig.config.source !== "api") return { status: "unavailable" };
  const { origin, timeoutMs } = parsedConfig.config;
  const target = backendPhotoUrl(searchParams, origin);
  if (!target) return { status: "bad-request" };
  try {
    const response = await fetcher(target, {
      method: "GET", headers: { Accept: "image/jpeg, image/png, image/webp" }, credentials: "omit",
      redirect: "error", cache: "no-store", signal: AbortSignal.timeout(timeoutMs),
    });
    const contentType = (response.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
    if (response.status !== 200 || !ALLOWED_TYPES.has(contentType)) {
      await response.body?.cancel().catch(() => undefined);
      return { status: [401, 403, 404].includes(response.status) ? "not-found" : "unavailable" };
    }
    const body = await readBoundedBody(response, MAX_PHOTO_BYTES);
    return body ? { status: "ok", body, contentType } : { status: "unavailable" };
  } catch { return { status: "unavailable" }; }
}
