import { z } from "zod";

// Ảnh lô: backend (kho Local) trả đường dẫn tương đối /api/files/local/{khóa}?expires=..&sig=.. thuộc origin của backend,
// trình duyệt không được biết origin đó. Kho Azure trả URL https tuyệt đối tới máy chủ lưu trữ công khai.
//  - đường dẫn local (tương đối, hoặc tuyệt đối cùng origin backend) -> đi qua /origin/photo (proxy phía máy chủ);
//  - https tuyệt đối khác -> trình duyệt tải thẳng (không đi qua máy chủ web, nên không có SSRF);
//  - mọi thứ khác (http ngoài backend, javascript:, data:, có user:pass) -> bỏ.
const KEY_PATTERN = /^[a-z0-9-]{1,64}(?:\/[A-Za-z0-9._-]{1,100}){1,4}$/u;
const photoQuerySchema = z.strictObject({
  k: z.string().regex(KEY_PATTERN).refine((key) => key.split("/").every((part) => !/^\.+$/u.test(part))),
  e: z.string().regex(/^\d{1,12}$/u),
  s: z.string().regex(/^[0-9a-f]{64}$/u),
});
export type OriginPhotoQuery = z.infer<typeof photoQuerySchema>;

export const PHOTO_PROXY_PATH = "/origin/photo";
const LOCAL_DOWNLOAD_PREFIX = "/api/files/local/";

function proxyHref(query: OriginPhotoQuery): string {
  return `${PHOTO_PROXY_PATH}?${new URLSearchParams({ k: query.k, e: query.e, s: query.s }).toString()}`;
}

function fromLocalPath(pathname: string, search: string): string | null {
  if (!pathname.startsWith(LOCAL_DOWNLOAD_PREFIX)) return null;
  let key: string;
  try { key = decodeURIComponent(pathname.slice(LOCAL_DOWNLOAD_PREFIX.length)); } catch { return null; }
  const params = new URLSearchParams(search);
  if ([...params.keys()].some((name) => name !== "expires" && name !== "sig")) return null;
  const parsed = photoQuerySchema.safeParse({ k: key, e: params.get("expires") ?? "", s: params.get("sig") ?? "" });
  return parsed.success ? proxyHref(parsed.data) : null;
}

/** Đổi URL ảnh của backend thành nguồn an toàn cho thẻ img, hoặc null nếu không dùng được. */
export function resolvePhotoSource(raw: string, backendOrigin: string): string | null {
  try {
    if (raw.startsWith("/") && !raw.startsWith("//")) {
      const local = new URL(raw, "http://origin.invalid");
      return fromLocalPath(local.pathname, local.search);
    }
    const url = new URL(raw);
    if (url.username || url.password || url.hash) return null;
    if (url.origin === backendOrigin) return fromLocalPath(url.pathname, url.search);
    return url.protocol === "https:" ? url.href : null;
  } catch { return null; }
}

/** Dựng lại URL backend từ tham số proxy đã kiểm tra; luôn cùng origin backend đã cấu hình. */
export function backendPhotoUrl(searchParams: URLSearchParams, backendOrigin: string): URL | null {
  if ([...searchParams.keys()].some((name) => !["k", "e", "s"].includes(name))) return null;
  const parsed = photoQuerySchema.safeParse({ k: searchParams.get("k") ?? "", e: searchParams.get("e") ?? "", s: searchParams.get("s") ?? "" });
  if (!parsed.success) return null;
  const target = new URL(`${LOCAL_DOWNLOAD_PREFIX}${parsed.data.k}`, backendOrigin);
  target.search = new URLSearchParams({ expires: parsed.data.e, sig: parsed.data.s }).toString();
  return target.origin === backendOrigin && target.pathname.startsWith(LOCAL_DOWNLOAD_PREFIX) ? target : null;
}
