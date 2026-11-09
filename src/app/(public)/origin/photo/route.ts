import { fetchOriginPhoto } from "@/server/public/origin-photo-proxy";

// Proxy ảnh lô: trình duyệt không biết origin backend. Tham số được kiểm tra chặt trong fetchOriginPhoto.
export async function GET(request: Request) {
  const result = await fetchOriginPhoto(new URL(request.url).searchParams);
  if (result.status !== "ok") {
    const status = result.status === "bad-request" ? 400 : result.status === "not-found" ? 404 : 502;
    return new Response(null, { status, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(Buffer.from(result.body), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Content-Length": String(result.body.byteLength),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
