import { formatVndWithSymbol } from "@/shared/format/vnd";
import { CLAIM_STATUS, type ClaimOffer } from "./claim-contracts";

/**
 * Nhãn tiếng Việt cho mọi giá trị backend trả về. Không bao giờ hiển thị chuỗi tiếng Anh của backend (status, channel...):
 * tra theo mã số hoặc tên enum, không có thì dùng nhãn trung tính.
 */
const NEUTRAL = "Chưa rõ";
const lookup = (table: Record<string, string>, key: string | number | null) => (key === null ? "—" : table[String(key)] ?? NEUTRAL);

/** STD-QUALITY-CLAIM: 3701 / 3702 / 3703. */
export const claimStatus = (statusId: number) => lookup({ "3701": "Chờ phản hồi", "3702": "Đã từ chối", "3703": "Đã chấp nhận" }, statusId);
export const claimTone = (statusId: number) => (statusId === CLAIM_STATUS.accepted ? "good" : statusId === CLAIM_STATUS.rejected ? "bad" : "warn");
export const offerLabel = (offer: ClaimOffer | null) => lookup({ ReturnAllGoods: "Trả lại toàn bộ hàng", PriceCutWholeInvoice: "Giảm giá cả hóa đơn" }, offer);
/** Trạng thái hóa đơn: STD-SALES-INVOICE 3501 / 3502. */
export const invoiceStatus = (statusId: number) => lookup({ "3501": "Hoàn thành", "3502": "Đã hủy" }, statusId);
/** Trạng thái gửi tin: 1601 Đang gửi, 1602 Đã gửi, 1603 Chưa gửi. */
export const deliveryStatus = (statusId: number | null) => lookup({ "1601": "Đang gửi", "1602": "Đã gửi", "1603": "Chưa gửi" }, statusId);
export const sendingChannel = (channel: string) => lookup({ Sms: "Tin nhắn SMS", ZaloOa: "Zalo OA", Push: "Thông báo trên ứng dụng" }, channel);

const vnNumber = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });
export const num = (value: number) => vnNumber.format(value);
export const vnd = (value: number | null) => (value === null ? "—" : formatVndWithSymbol(value));
/** "2026-11-09" -> "09/11/2026" (ghép chuỗi, không qua múi giờ). */
export const dateText = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; };
export const dateTimeText = (iso: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

/** Đường dẫn ảnh qua BFF (trình duyệt không mở được đường dẫn ký sẵn của backend). `area` là khóa vùng của màn hình. */
export const claimPhotoSrc = (area: "claim-reports" | "quality-claims", claimId: string, index: number) =>
  `/api/operations/${area}?action=photo&id=${encodeURIComponent(claimId)}&index=${index}`;
