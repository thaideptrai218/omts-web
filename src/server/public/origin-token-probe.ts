import "server-only";
import { parseServerBackendConfig } from "@/server/config/backend-config";
import { originClientHeaders } from "./origin-client-headers";
import { parseQrToken } from "./origin-qr-token";

const MAX_PROBE_MS = 4_000;

/**
 * Kiểm tra nhanh trước khi trang vẽ: mã QR sai dạng hoặc không có hóa đơn nào thì "not-found" (để trả HTTP 404 thật,
 * vì trang đã bắt đầu stream thì không đổi được mã trạng thái). Mọi kết quả khác (200, 429, backend lỗi) là "pass":
 * trang tự hiển thị đúng trạng thái. Chỉ đọc mã trạng thái, không đọc nội dung.
 */
export async function probeOriginToken(
  rawToken: unknown,
  requestHeaders: Headers,
  environment: Readonly<Record<string, unknown>> = process.env,
  fetcher: typeof fetch = fetch,
): Promise<"not-found" | "pass"> {
  const token = parseQrToken(rawToken);
  if (!token) return "not-found";
  const config = parseServerBackendConfig(environment);
  if (config.status !== "valid" || config.config.source !== "api") return "pass";
  const { origin, timeoutMs } = config.config;
  try {
    const url = new URL(`/api/public/provenance/${token}`, origin);
    if (url.origin !== origin) return "pass";
    const response = await fetcher(url, {
      method: "GET", headers: { Accept: "application/json", ...originClientHeaders(requestHeaders, environment) }, credentials: "omit",
      redirect: "error", cache: "no-store", signal: AbortSignal.timeout(Math.min(timeoutMs, MAX_PROBE_MS)),
    });
    await response.body?.cancel().catch(() => undefined);
    return response.status === 404 ? "not-found" : "pass";
  } catch {
    return "pass";
  }
}

/** Tên hợp tác xã cho trang 404 (đọc từ hồ sơ HTX); null khi chưa đọc được. */
export async function readCooperativeNameForNotFound(
  environment: Readonly<Record<string, unknown>> = process.env,
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  const config = parseServerBackendConfig(environment);
  if (config.status !== "valid" || config.config.source !== "api") return null;
  try {
    const response = await fetcher(new URL("/api/public/cooperative-brand", config.config.origin), {
      method: "GET", headers: { Accept: "application/json" }, credentials: "omit", redirect: "error", cache: "no-store",
      signal: AbortSignal.timeout(Math.min(config.config.timeoutMs, MAX_PROBE_MS)),
    });
    if (response.status !== 200) { await response.body?.cancel().catch(() => undefined); return null; }
    const body: unknown = await response.json();
    const name = typeof body === "object" && body !== null && "fullName" in body ? (body as { fullName: unknown }).fullName : null;
    return typeof name === "string" && name.trim() && name.length <= 255 ? name.trim() : null;
  } catch {
    return null;
  }
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Trang 404 thân thiện (tiếng Việt), tự chứa, không gọi tài nguyên ngoài; noindex. */
export function originNotFoundResponse(cooperativeName: string | null): Response {
  const name = escapeHtml(cooperativeName ?? "Hợp tác xã");
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><title>Không tìm thấy nguồn gốc | ${name}</title>
<style>body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#eef6f4;color:#0c2b33;min-height:100vh;display:flex;flex-direction:column}
header{background:#fff;border-bottom:1px solid #d5e4e1;padding:.85rem 1rem;font-weight:700}main{flex:1;display:grid;place-items:center;padding:1.5rem 1rem}
section{background:#fff;border:1px solid #d5e4e1;border-radius:1rem;padding:1.75rem;max-width:34rem}h1{margin:0 0 .75rem;font-size:1.4rem}p{margin:0;line-height:1.65}
footer{padding:1.5rem 1rem;text-align:center;background:#07434b;color:#d6ecea;font-size:.9rem}</style></head><body>
<header>${name}</header>
<main id="noi-dung"><section aria-labelledby="t"><h1 id="t">Không tìm thấy thông tin nguồn gốc</h1>
<p>Mã QR này không đúng hoặc không còn dùng được. Vui lòng quét lại mã QR trên hóa đơn, hoặc mở đường link trong tin nhắn hóa đơn. Nếu vẫn không xem được, hãy liên hệ ${name} để được hỗ trợ.</p></section></main>
<footer>${name} · Trang công khai truy xuất nguồn gốc</footer></body></html>`;
  return new Response(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" },
  });
}
