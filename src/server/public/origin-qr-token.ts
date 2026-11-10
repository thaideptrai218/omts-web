import { z } from "zod";

// Mã QR của hóa đơn: 128 bit ngẫu nhiên dạng base64url, đúng 22 ký tự (BR-TRACE-02 phía backend).
// Kiểm tra chặt TRƯỚC khi gọi backend để không bao giờ nối chuỗi lạ vào đường dẫn.
const qrTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{22}$/u);

export type QrToken = string & { readonly __brand: "QrToken" };

export function parseQrToken(value: unknown): QrToken | null {
  const parsed = qrTokenSchema.safeParse(value);
  return parsed.success ? (parsed.data as QrToken) : null;
}

const languageSchema = z.enum(["vi", "en"]);
export type OriginLanguage = z.infer<typeof languageSchema>;

/** Chỉ nhận "en" hoặc "vi"; mọi giá trị khác (kể cả mảng) rơi về tiếng Việt. */
export function parseOriginLanguage(value: unknown): OriginLanguage {
  const parsed = languageSchema.safeParse(value);
  return parsed.success ? parsed.data : "vi";
}
