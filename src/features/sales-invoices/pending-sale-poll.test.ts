import { describe, expect, it } from "vitest";
import { formatWaited, isTerminal, MAX_FAILURES, nextDelayMs, resumePoll, startPoll, stepPoll } from "./pending-sale-poll";
import type { PendingSale } from "./vietqr-contracts";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const sale = (over: Partial<PendingSale> = {}): PendingSale => ({
  code: "HD000124", status: "Awaiting", zone: { id: id(1), code: "VP01", name: "VP01" }, customer: null, walkInCustomer: true, total: 900_000, cashAmount: 0, toPayAmount: 900_000, receivedAmount: 0,
  vietQr: null, createdAt: "2026-11-09T03:00:00+07:00", invoiceId: null, invoice: null, endedAt: null, ...over,
});
// Hóa đơn tối thiểu: máy trạng thái chỉ cần biết "đã có hóa đơn", không đọc nội dung.
const invoice = { invoice: { id: id(2) }, change: 0, subtractedFromDebt: 0, message: "", messageCode: "" } as unknown as NonNullable<PendingSale["invoice"]>;

describe("máy trạng thái theo dõi giao dịch VietQR", () => {
  it("đang chờ thì tiếp tục hỏi; đã có hóa đơn thì kết thúc", () => {
    const waiting = startPoll(sale());
    expect(waiting.phase).toBe("waiting");
    expect(stepPoll(waiting, { type: "view", sale: sale() }).phase).toBe("waiting");
    const done = stepPoll(waiting, { type: "view", sale: sale({ status: "Completed", invoiceId: id(2), invoice }) });
    expect(done.phase).toBe("completed"); expect(isTerminal(done.phase)).toBe(true);
    expect(stepPoll(waiting, { type: "view", sale: sale({ status: "PaymentChanged", invoice }) }).phase).toBe("changed");
    expect(stepPoll(waiting, { type: "view", sale: sale({ status: "Stopped" }) }).phase).toBe("stopped");
  });
  it("Completed mà chưa có hóa đơn thì vẫn chờ, không báo xong sớm", () => {
    expect(stepPoll(startPoll(sale()), { type: "view", sale: sale({ status: "Completed" }) }).phase).toBe("waiting");
  });
  it("trạng thái kết thúc không bị kết quả đến muộn ghi đè", () => {
    const stopped = stepPoll(startPoll(sale()), { type: "view", sale: sale({ status: "Stopped" }) });
    expect(stepPoll(stopped, { type: "view", sale: sale() })).toBe(stopped);
    expect(stepPoll(stopped, { type: "failure", httpStatus: 503 })).toBe(stopped);
  });
  it("404 là không còn giao dịch, 401/403 là mất quyền; cả hai ngừng hỏi", () => {
    expect(stepPoll(startPoll(sale()), { type: "failure", httpStatus: 404 }).phase).toBe("gone");
    expect(stepPoll(startPoll(sale()), { type: "failure", httpStatus: 403 }).phase).toBe("denied");
    expect(stepPoll(startPoll(sale()), { type: "failure", httpStatus: 401 }).phase).toBe("denied");
  });
  it("lỗi mạng tạm thời: đếm lỗi, đủ ngưỡng thì ngừng tự hỏi, thành công thì xóa đếm", () => {
    let state = startPoll(sale());
    for (let i = 1; i < MAX_FAILURES; i++) { state = stepPoll(state, { type: "failure", httpStatus: 0 }); expect(state.phase).toBe("waiting"); expect(state.failures).toBe(i); }
    expect(stepPoll(state, { type: "view", sale: sale() }).failures).toBe(0);
    const stalled = stepPoll(state, { type: "failure", httpStatus: 503 });
    expect(stalled.phase).toBe("stalled");
    expect(resumePoll(stalled)).toMatchObject({ phase: "waiting", failures: 0 });
    expect(stepPoll(stalled, { type: "view", sale: sale({ status: "Completed", invoice }) }).phase).toBe("completed");
  });
  it("kết quả của giao dịch khác mã bị coi là lỗi hợp đồng", () => {
    expect(stepPoll(startPoll(sale()), { type: "view", sale: sale({ code: "HD000999", status: "Completed", invoice }) })).toMatchObject({ phase: "waiting", failures: 1 });
  });
});

describe("nhịp hỏi", () => {
  const waiting = startPoll(sale());
  it("3 giây lúc đầu, chậm dần khi chờ lâu", () => {
    expect(nextDelayMs(waiting, 0)).toBe(3000);
    expect(nextDelayMs(waiting, 119_999)).toBe(3000);
    expect(nextDelayMs(waiting, 120_000)).toBe(5000);
    expect(nextDelayMs(waiting, 600_000)).toBe(10_000);
  });
  it("lỗi liên tiếp thì lùi theo lũy thừa 2, tối đa 30 giây", () => {
    const after = (n: number) => { let s = waiting; for (let i = 0; i < n; i++) s = stepPoll(s, { type: "failure", httpStatus: 0 }); return nextDelayMs(s, 0); };
    expect([after(1), after(2), after(3), after(4), after(5)]).toEqual([6000, 12_000, 24_000, 30_000, 30_000]);
  });
});

describe("thời gian đã chờ", () => {
  it("định dạng mm:ss, đồng hồ lệch hoặc ngày sai thì là 00:00", () => {
    const created = "2026-11-09T03:00:00+07:00", at = Date.parse(created);
    expect(formatWaited(created, at + 75_000)).toBe("01:15");
    expect(formatWaited(created, at - 5000)).toBe("00:00");
    expect(formatWaited("khong-phai-ngay", at)).toBe("00:00");
  });
});
