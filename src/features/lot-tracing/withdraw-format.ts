import { maxReasonLength, type WithdrawalNotice } from "./withdraw-contracts";

/** Hàm thuần của luồng thu hồi: kiểm tra lý do, nhãn trạng thái gửi, đếm khách cần gọi. */

/** Trả về thông báo lỗi tiếng Việt, hoặc undefined khi lý do hợp lệ (bắt buộc, tối đa 1.000 ký tự). */
export function reasonProblem(reason: string): string | undefined {
  const text = reason.trim();
  if (!text) return "Hãy nhập lý do thu hồi.";
  if (text.length > maxReasonLength) return `Lý do tối đa ${maxReasonLength} ký tự.`;
}

export const deliveryLabel = (statusId: number) => ({ 1601: "Đang gửi", 1602: "Đã gửi", 1603: "Chưa gửi được" }[statusId] ?? "Không xác định");
export const deliveryTone = (statusId: number) => statusId === 1602 ? "success" as const : statusId === 1603 ? "danger" as const : "neutral" as const;
export const channelLabel = (channel: string) => channel === "Sms" ? "SMS" : channel === "Zalo" ? "Zalo" : channel;

/** Số khách hàng chủ hợp tác xã cần gọi điện vì SMS không gửi được (BR-TRACE-07). */
export const toCallCount = (notices: readonly WithdrawalNotice[]) => notices.filter((notice) => notice.toCall).length;
