import type { InvoiceAction } from "./invoice-list-contracts";
import { knownActions } from "./invoice-list-contracts";

/**
 * Nhãn tiếng Việt cho mọi giá trị backend trả về (trạng thái, kênh gửi, hình thức thanh toán...). Không bao giờ hiển thị chuỗi tiếng Anh của backend:
 * tra theo mã số hoặc tên enum, không có thì dùng nhãn trung tính.
 */
const NEUTRAL = "Chưa rõ";
const lookup = (table: Record<string, string>, key: string | number) => table[String(key)] ?? NEUTRAL;

/** Trạng thái hóa đơn: STD-SALES-INVOICE 3501 / 3502. */
export const invoiceStatus = (statusId: number) => lookup({ "3501": "Hoàn thành", "3502": "Đã hủy" }, statusId);
/** Trạng thái gửi tin: 1601 Đang gửi, 1602 Đã gửi, 1603 Chưa gửi. */
export const deliveryStatus = (statusId: number) => lookup({ "1601": "Đang gửi", "1602": "Đã gửi", "1603": "Chưa gửi" }, statusId);
/** Trạng thái khoản thanh toán của khách: 3601 / 3602 / 3603. */
export const paymentStatus = (statusId: number) => lookup({ "3601": "Chờ xác nhận", "3602": "Đã xác nhận", "3603": "Đã hủy" }, statusId);
export const paymentTerm = (term: string) => lookup({ PayNow: "Trả ngay", PayLater: "Trả sau" }, term);
export const paymentMethod = (method: string) => lookup({ Cash: "Tiền mặt", OtherTransfer: "Chuyển khoản", VietQrInvoice: "VietQR" }, method);
export const paymentKind = (kind: string) => lookup({ Payment: "Khách thanh toán", PaidBack: "Trả lại khách" }, kind);
export const sendingChannel = (channel: string) => lookup({ Sms: "Tin nhắn SMS", ZaloOa: "Zalo OA" }, channel);
export const correctionKind = (kind: string) => lookup({ DataEntryError: "Sửa lỗi nhập liệu", PriceCutAfterClaim: "Giảm giá sau khiếu nại" }, kind);
export const priceSource = (source: string) => lookup({ PriceList: "Bảng giá", DecidedByOwner: "Chủ HTX quyết định" }, source);

/** Tình trạng thu tiền của một dòng danh sách: hóa đơn đã hủy không có tình trạng này. */
export const paidState = (isPaid: boolean | null) => (isPaid === null ? "—" : isPaid ? "Đã trả đủ" : "Còn nợ");
export const paidTone = (isPaid: boolean | null) => (isPaid === null ? "none" : isPaid ? "good" : "warn");
export const statusTone = (statusId: number) => (statusId === 3501 ? "good" : statusId === 3502 ? "bad" : "none");
export const deliveryTone = (statusId: number) => (statusId === 1602 ? "good" : statusId === 1601 ? "warn" : "none");

/** Chỉ giữ các lệnh mà màn hình hiểu; lệnh lạ của backend bị bỏ qua. */
export function allowedSet(actions: readonly string[]): ReadonlySet<InvoiceAction> {
  return new Set(knownActions.filter((action) => actions.includes(action)));
}

const vnNumber = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });
export const num = (value: number) => vnNumber.format(value);
export const vnd = (value: number) => `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)} ₫`;
/** "2026-11-09" -> "09/11/2026" (ghép chuỗi, không qua múi giờ). */
export const dateText = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; };
export const dateTimeText = (iso: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

/**
 * Thông báo lỗi của sửa / hủy hóa đơn. Mã MSG-SALE-20/21 chưa có trong danh mục thông điệp của Web nên BFF không chuyển mã: 409 không mã được diễn đạt chung,
 * liệt kê các lý do mà backend dùng (đã có phiếu trả hàng, hóa đơn không còn hoàn thành, tổng tiền khách lẻ không được tăng).
 */
export function changeErrorText(httpStatus: number, code: string | undefined): string | undefined {
  if (code === "MSG06") return "Hóa đơn vừa được thay đổi ở nơi khác. Hãy tải lại hóa đơn rồi thử lại.";
  if (httpStatus === 403) return "Chỉ Chủ hợp tác xã được sửa hoặc hủy hóa đơn.";
  if (httpStatus === 409 && !code) return "Hóa đơn chưa thể sửa hoặc hủy: có thể đã có phiếu trả hàng, đã bị hủy, hoặc hóa đơn khách lẻ bị tăng tổng tiền. Hãy tải lại hóa đơn để đối chiếu.";
  return undefined;
}
