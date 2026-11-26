import { z } from "zod";
import { fileStoragePrefix, storedFileKey } from "../operations/evidence-target";

// Ảnh lô: backend (kho Local) trả đường dẫn tương đối /api/files/local/{khóa}?expires=..&sig=.. thuộc origin của backend,
// trình duyệt không được biết origin đó. Kho Azure trả URL https tuyệt đối tới máy chủ lưu trữ công khai.
//  - đường dẫn local (tương đối, hoặc tuyệt đối cùng origin backend) -> đi qua /origin/photo (proxy phía máy chủ);
//  - link ký sẵn của bucket R2 (OMTS_FILE_STORAGE_ORIGIN) -> cũng đi qua /origin/photo, vì CSP của trang chỉ cho ảnh cùng origin;
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

// Logo và ảnh bìa của HTX (hồ sơ trong Thiết lập): backend trả đường dẫn công khai không ký /api/public/cooperative/{logos|cover-photos}/{năm}/{tháng}/{tệp}.
// Cũng đi qua proxy để trình duyệt không biết origin backend; chỉ hai thư mục đó, tên tệp đúng mẫu.
const COOPERATIVE_FILE_PREFIX = "/api/public/cooperative/";
const cooperativeFileQuerySchema = z.strictObject({
  c: z.enum(["logos", "cover-photos"]),
  f: z.string().regex(/^\d{4}\/\d{2}\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/u),
});

function proxyHref(query: OriginPhotoQuery): string {
  return `${PHOTO_PROXY_PATH}?${new URLSearchParams({ k: query.k, e: query.e, s: query.s }).toString()}`;
}

function fromCooperativeFilePath(pathname: string): string | null {
  if (!pathname.startsWith(COOPERATIVE_FILE_PREFIX)) return null;
  const [folder, ...rest] = pathname.slice(COOPERATIVE_FILE_PREFIX.length).split("/");
  const parsed = cooperativeFileQuerySchema.safeParse({ c: folder, f: rest.join("/") });
  return parsed.success && !parsed.data.f.includes("..") ? `${PHOTO_PROXY_PATH}?${new URLSearchParams(parsed.data).toString()}` : null;
}

function fromLocalPath(pathname: string, search: string): string | null {
  if (pathname.startsWith(COOPERATIVE_FILE_PREFIX)) return search ? null : fromCooperativeFilePath(pathname);
  if (!pathname.startsWith(LOCAL_DOWNLOAD_PREFIX)) return null;
  let key: string;
  try { key = decodeURIComponent(pathname.slice(LOCAL_DOWNLOAD_PREFIX.length)); } catch { return null; }
  const params = new URLSearchParams(search);
  if ([...params.keys()].some((name) => name !== "expires" && name !== "sig")) return null;
  const parsed = photoQuerySchema.safeParse({ k: key, e: params.get("expires") ?? "", s: params.get("sig") ?? "" });
  return parsed.success ? proxyHref(parsed.data) : null;
}

// Ảnh R2: proxy nhận khóa (r) và đúng các tham số X-Amz-* của link ký; host và bucket luôn lấy từ cấu hình máy chủ.
const AMZ_PARAM = /^X-Amz-[A-Za-z-]{1,32}$/u;
const AMZ_VALUE = /^[A-Za-z0-9._\/;-]{1,512}$/u;
const storageKeySchema = z.string().regex(KEY_PATTERN).refine((key) => key.split("/").every((part) => !/^\.+$/u.test(part)));

function fromStorageUrl(url: URL, environment: Readonly<Record<string, unknown>>): string | null {
  const key = storedFileKey(url, "null", environment);
  if (!key || !storageKeySchema.safeParse(key).success) return null;
  const query = new URLSearchParams({ r: key });
  for (const [name, value] of url.searchParams) {
    if (!AMZ_VALUE.test(value)) return null;
    query.append(name, value);
  }
  return `${PHOTO_PROXY_PATH}?${query.toString()}`;
}

/** Đổi URL ảnh của backend thành nguồn an toàn cho thẻ img, hoặc null nếu không dùng được. */
export function resolvePhotoSource(raw: string, backendOrigin: string, environment: Readonly<Record<string, unknown>> = process.env): string | null {
  try {
    if (raw.startsWith("/") && !raw.startsWith("//")) {
      const local = new URL(raw, "http://origin.invalid");
      return fromLocalPath(local.pathname, local.search);
    }
    const url = new URL(raw);
    if (url.username || url.password || url.hash) return null;
    if (url.origin === backendOrigin) return fromLocalPath(url.pathname, url.search);
    if (url.origin === fileStoragePrefix(environment)?.origin) return fromStorageUrl(url, environment);
    return url.protocol === "https:" ? url.href : null;
  } catch { return null; }
}

/** Dựng lại URL backend từ tham số proxy đã kiểm tra; luôn cùng origin backend đã cấu hình. */
export function backendPhotoUrl(searchParams: URLSearchParams, backendOrigin: string, environment: Readonly<Record<string, unknown>> = process.env): URL | null {
  if (searchParams.has("r")) {
    const storage = fileStoragePrefix(environment);
    const key = storageKeySchema.safeParse(searchParams.get("r") ?? "");
    const signed = [...searchParams].filter(([name]) => name !== "r");
    if (!storage || !key.success || searchParams.getAll("r").length !== 1 || signed.length === 0
      || signed.some(([name, value]) => !AMZ_PARAM.test(name) || !AMZ_VALUE.test(value))) return null;
    const target = new URL(`${storage.path}${key.data}`, storage.origin);
    target.search = new URLSearchParams(signed).toString();
    return storedFileKey(target, backendOrigin, environment) === key.data ? target : null;
  }
  if (searchParams.has("c")) {
    const file = cooperativeFileQuerySchema.safeParse({ c: searchParams.get("c") ?? "", f: searchParams.get("f") ?? "" });
    if (!file.success || [...searchParams.keys()].some((name) => name !== "c" && name !== "f") || file.data.f.includes("..")) return null;
    const target = new URL(`${COOPERATIVE_FILE_PREFIX}${file.data.c}/${file.data.f}`, backendOrigin);
    return target.origin === backendOrigin && target.pathname.startsWith(COOPERATIVE_FILE_PREFIX) ? target : null;
  }
  if ([...searchParams.keys()].some((name) => !["k", "e", "s"].includes(name))) return null;
  const parsed = photoQuerySchema.safeParse({ k: searchParams.get("k") ?? "", e: searchParams.get("e") ?? "", s: searchParams.get("s") ?? "" });
  if (!parsed.success) return null;
  const target = new URL(`${LOCAL_DOWNLOAD_PREFIX}${parsed.data.k}`, backendOrigin);
  target.search = new URLSearchParams({ expires: parsed.data.e, sig: parsed.data.s }).toString();
  return target.origin === backendOrigin && target.pathname.startsWith(LOCAL_DOWNLOAD_PREFIX) ? target : null;
}
