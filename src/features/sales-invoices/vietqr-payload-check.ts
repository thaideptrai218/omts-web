/**
 * Kiểm tra chuỗi VietQR (EMVCo) backend trả về TRƯỚC khi vẽ thành mã QR: máy thu ngân không nên hiện một mã sai số tiền hay sai nội dung.
 * Đây là kiểm tra khớp định dạng của backend (VietQrPayload.Build), không phải bộ giải mã EMVCo đầy đủ.
 */
const CRC_SUFFIX = /6304[0-9A-F]{4}$/;

/** CRC-16/CCITT-FALSE (đa thức 0x1021, khởi tạo 0xFFFF) trên các ký tự ASCII, như EmvQrEncoding.Crc16Ccitt của backend. */
export function crc16Ccitt(text: string): number {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
  }
  return crc;
}

/** Tách các đối tượng "mã(2) độ dài(2) giá trị" ở cùng một cấp; undefined nếu cấu trúc sai. */
export function readEmvFields(text: string): Map<string, string> | undefined {
  const fields = new Map<string, string>();
  for (let i = 0; i < text.length;) {
    const id = text.slice(i, i + 2), length = /^\d{2}$/.test(text.slice(i + 2, i + 4)) ? Number(text.slice(i + 2, i + 4)) : NaN;
    const value = text.slice(i + 4, i + 4 + length);
    if (!/^\d{2}$/.test(id) || Number.isNaN(length) || value.length !== length || fields.has(id)) return undefined;
    fields.set(id, value);
    i += 4 + length;
  }
  return fields;
}

/** Chuỗi hợp lệ khi: ASCII in được, CRC đúng, tiền VND, số tiền khớp và nội dung chuyển khoản khớp với phần hiển thị cho thu ngân. */
export function isVietQrPayloadConsistent(payload: string, amount: number, content: string): boolean {
  if (payload.length < 40 || payload.length > 400 || !/^[\x20-\x7e]+$/.test(payload) || !payload.startsWith("000201") || !CRC_SUFFIX.test(payload)) return false;
  const covered = payload.slice(0, -4);
  if (crc16Ccitt(covered) !== parseInt(payload.slice(-4), 16)) return false;
  const fields = readEmvFields(payload);
  const extra = fields?.get("62") === undefined ? undefined : readEmvFields(fields.get("62")!);
  return fields?.get("53") === "704" && fields.get("54") === String(amount) && fields.get("58") === "VN" && extra?.get("08") === content;
}
