import "server-only";
import { cacheLife } from "next/cache";
import { z } from "zod";
import { parseServerBackendConfig } from "@/server/config/backend-config";

// Tên hợp tác xã luôn đọc từ hồ sơ HTX (Thiết lập) qua GET api/public/cooperative-brand; không gõ cứng ở màn hình nào.
const brandSchema = z.object({ fullName: z.string().trim().min(1).max(255), shortName: z.string().nullable().optional() });

export type CooperativeBrand = Readonly<{ fullName: string; shortName: string }>;

/** Chữ chung khi chưa đọc được hồ sơ (API tắt, chế độ mock): không phải tên một hợp tác xã cụ thể. */
export const GENERIC_COOPERATIVE_BRAND: CooperativeBrand = Object.freeze({ fullName: "Hợp tác xã", shortName: "Hợp tác xã" });

/**
 * Đọc tên HTX từ API. Có cache ngắn (làm mới sau ~10 giây) để mỗi lần mở trang không gọi API;
 * đổi tên trong Thiết lập hiện trên mọi màn ngay sau đó.
 */
export async function getCooperativeBrand(): Promise<CooperativeBrand> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 10, expire: 3600 });
  const parsedConfig = parseServerBackendConfig(process.env);
  if (parsedConfig.status !== "valid" || parsedConfig.config.source !== "api") return GENERIC_COOPERATIVE_BRAND;
  const { origin, timeoutMs } = parsedConfig.config;
  try {
    const response = await fetch(new URL("/api/public/cooperative-brand", origin), {
      method: "GET", headers: { Accept: "application/json" }, credentials: "omit", redirect: "error", signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status !== 200) { await response.body?.cancel().catch(() => undefined); return GENERIC_COOPERATIVE_BRAND; }
    const parsed = brandSchema.safeParse(await response.json());
    if (!parsed.success) return GENERIC_COOPERATIVE_BRAND;
    const fullName = parsed.data.fullName;
    return { fullName, shortName: parsed.data.shortName?.trim() || fullName };
  } catch {
    return GENERIC_COOPERATIVE_BRAND;
  }
}
