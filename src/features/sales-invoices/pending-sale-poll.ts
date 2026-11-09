import type { PendingSale } from "./vietqr-contracts";

/**
 * Máy trạng thái thuần của việc theo dõi một giao dịch VietQR đang chờ (GET pending/{code} theo chu kỳ vài giây, SALE-05 bước 8).
 * Không có timer hay mạng ở đây: hook chỉ đưa kết quả đọc vào `stepPoll` và hỏi `nextDelayMs`, nên dễ kiểm thử.
 *
 * waiting   đang chờ, tiếp tục hỏi
 * completed tiền đã về và hóa đơn đã lưu (kết thúc)
 * changed   giao dịch đã đổi phương thức và hóa đơn đã lưu (kết thúc)
 * stopped   đã dừng bán (kết thúc)
 * gone      không còn tìm thấy giao dịch (404)  | denied không còn quyền (401/403): kết thúc, không hỏi lại
 * stalled   mất kết nối liên tiếp quá ngưỡng: ngừng tự hỏi, chờ người dùng bấm kiểm tra lại
 */
export type PollPhase = "waiting" | "completed" | "changed" | "stopped" | "gone" | "denied" | "stalled";
export type PollState = Readonly<{ phase: PollPhase; sale: PendingSale; failures: number }>;
export type PollEvent = Readonly<{ type: "view"; sale: PendingSale }> | Readonly<{ type: "failure"; httpStatus: number }>;

export const MAX_FAILURES = 6;
const BASE_DELAY_MS = 3_000, SLOW_AFTER_MS = 120_000, SLOWER_AFTER_MS = 600_000, MAX_BACKOFF_MS = 30_000;

export const isTerminal = (phase: PollPhase) => phase !== "waiting";

/** Trạng thái backend -> giai đoạn. Đã Completed/PaymentChanged nhưng chưa có hóa đơn thì vẫn chờ, vì màn hình cần hóa đơn để đi tiếp. */
function phaseOf(sale: PendingSale): PollPhase {
  if (sale.status === "Stopped") return "stopped";
  if (sale.status === "Completed" && sale.invoice) return "completed";
  if (sale.status === "PaymentChanged" && sale.invoice) return "changed";
  return "waiting";
}

export const startPoll = (sale: PendingSale): PollState => ({ phase: phaseOf(sale), sale, failures: 0 });

/** Người dùng bấm "Kiểm tra lại" sau khi đã ngừng tự hỏi. */
export const resumePoll = (state: PollState): PollState => state.phase === "stalled" ? { ...state, phase: "waiting", failures: 0 } : state;

export function stepPoll(state: PollState, event: PollEvent): PollState {
  if (isTerminal(state.phase) && state.phase !== "stalled") return state; // đã kết thúc thì không bị kết quả đến muộn ghi đè
  if (event.type === "view") {
    // Phản hồi của giao dịch khác (sai mã) là hợp đồng bị lệch: coi như lỗi, không tin.
    if (event.sale.code !== state.sale.code) return stepPoll(state, { type: "failure", httpStatus: 502 });
    return { phase: phaseOf(event.sale), sale: event.sale, failures: 0 };
  }
  if (event.httpStatus === 404) return { ...state, phase: "gone" };
  if (event.httpStatus === 401 || event.httpStatus === 403) return { ...state, phase: "denied" };
  const failures = state.failures + 1;
  return { ...state, failures, phase: failures >= MAX_FAILURES ? "stalled" : "waiting" };
}

/** Khoảng chờ trước lần hỏi kế tiếp: 3 giây, chậm dần khi chờ lâu; lỗi liên tiếp thì lùi theo lũy thừa 2 (tối đa 30 giây). */
export function nextDelayMs(state: PollState, waitedMs: number): number {
  if (state.failures > 0) return Math.min(MAX_BACKOFF_MS, BASE_DELAY_MS * 2 ** state.failures);
  return waitedMs < SLOW_AFTER_MS ? BASE_DELAY_MS : waitedMs < SLOWER_AFTER_MS ? 5_000 : 10_000;
}

/** "mm:ss" thời gian đã chờ kể từ lúc tạo giao dịch; đồng hồ máy lệch (âm) thì coi là 0. */
export function formatWaited(createdAt: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(createdAt)) / 1000)) || 0;
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
