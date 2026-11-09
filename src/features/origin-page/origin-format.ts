/** "2026-11-01" -> "01/11/2026" (định dạng dd/MM/yyyy của SRS); giá trị lạ trả nguyên văn. */
export function formatOriginDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
}

/** Số điện thoại chỉ giữ chữ số và dấu +, dùng cho liên kết tel:. Trả null nếu không đủ dài. */
export function telHref(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/[^\d+]/gu, "");
  return /^\+?\d{8,15}$/u.test(digits) ? `tel:${digits}` : null;
}

/** Liên kết bản đồ ngoài; toạ độ đã được zod giới hạn khoảng hợp lệ. */
export function mapHref(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

/** Chỉ cho phép liên kết http(s) cho website/mạng xã hội của hợp tác xã. */
export function safeWebHref(value: string | null | undefined): string | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch { return null; }
}
