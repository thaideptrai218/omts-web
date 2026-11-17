/** Đọc số người dùng gõ vào ô số lượng và ô tiền (cách viết Việt Nam), dùng chung cho các màn hóa đơn và thanh toán. */

/** Số kg: chấp nhận "," hoặc "." làm dấu thập phân (không có phân cách nghìn). Trống → 0; không hợp lệ → NaN. */
export function toKg(text: string): number {
  const cleaned = text.trim().replace(",", ".");
  return cleaned === "" ? 0 : /^\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : NaN;
}
/** Số tiền: chấp nhận "." hoặc khoảng trắng làm phân cách nghìn (kiểu Việt Nam). Trống → 0; không hợp lệ → NaN. */
export function toMoney(text: string): number {
  const cleaned = text.trim().replace(/[\s.]/g, "");
  return cleaned === "" ? 0 : /^\d+$/.test(cleaned) ? Number(cleaned) : NaN;
}
