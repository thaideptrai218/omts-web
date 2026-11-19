const oneDecimal = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

/**
 * Số tiền rút gọn cho trục biểu đồ: 1.200.000 -> "1,2 tr", 2.500.000.000 -> "2,5 tỷ", 350.000 -> "350 k".
 * Dưới 1.000 giữ nguyên số. Giá trị không hợp lệ (NaN/Infinity) trả về chuỗi rỗng để trục không hiện chữ lạ.
 */
export function formatMoneyShort(value: number): string {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value), sign = value < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${oneDecimal.format(abs / 1e9)} tỷ`;
  if (abs >= 1e6) return `${sign}${oneDecimal.format(abs / 1e6)} tr`;
  if (abs >= 1e3) return `${sign}${oneDecimal.format(abs / 1e3)} k`;
  return `${sign}${oneDecimal.format(abs)}`;
}
