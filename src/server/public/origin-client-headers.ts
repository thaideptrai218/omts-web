import "server-only";
import { createBffHeaders } from "@/server/backend/backend-transport";
import { readClientMeta } from "@/server/backend/client-meta";
import { parseBffClientConfig } from "@/server/config/bff-client-config";

/**
 * Header để backend nhận ra khách đang xem trang (IP, trình duyệt) theo đúng hợp đồng "BffClient" của API:
 * X-Bff-Secret + X-Client-Ip chỉ gửi khi đã cấu hình secret chung; nếu không, API bỏ qua và mọi khách chung một bucket giới hạn lượt.
 * IP chỉ đọc từ header do nơi triển khai kiểm soát (OMTS_WEB_CLIENT_IP_SOURCE), không bao giờ tin X-Forwarded-For của trình duyệt.
 */
export function originClientHeaders(
  requestHeaders: Headers | undefined,
  environment: Readonly<Record<string, unknown>> = process.env,
): Readonly<Record<string, string>> {
  if (!requestHeaders) return {};
  const bff = parseBffClientConfig(environment);
  const ipSource = bff.status === "valid" ? bff.config.ipSource : ({ kind: "none" } as const);
  return createBffHeaders(environment)(readClientMeta(requestHeaders, ipSource));
}
