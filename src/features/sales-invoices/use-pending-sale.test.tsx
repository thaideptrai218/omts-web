// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { usePendingSale } from "./use-pending-sale";
import type { PendingSale } from "./vietqr-contracts";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const wire = (over: Record<string, unknown> = {}) => ({
  code: "HD000124", status: "Awaiting", zone: { id: id(1), code: "VP01", name: "V" }, customer: null, walkInCustomer: true, total: 900_000, cashAmount: 0, toPayAmount: 900_000, receivedAmount: 0,
  vietQr: null, createdAt: "2026-11-09T03:00:00+07:00", invoiceId: null, invoice: null, endedAt: null, ...over,
});
const reply = (data: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify({ status: "success", data }), { status }));
const ask = async () => "cancel" as const;

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("hỏi theo nhịp 3 giây, không báo xong khi Completed chưa kèm hóa đơn", async () => {
  const completed = { status: "Completed", invoiceId: id(2), invoice: null };
  const fetchMock = vi.fn().mockImplementation(() => reply(wire(fetchMock.mock.calls.length >= 2 ? completed : {})));
  vi.stubGlobal("fetch", fetchMock);
  const { result } = renderHook(() => usePendingSale(wire() as unknown as PendingSale, ask));
  expect(fetchMock).not.toHaveBeenCalled(); // chưa hỏi ngay: chờ nhịp đầu 3 giây
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0][0])).toMatch(/code=HD000124&action=pending/);
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  // Completed nhưng chưa kèm hóa đơn: vẫn phải chờ, không báo xong sớm.
  expect(result.current.poll.phase).toBe("waiting");
});

it("gỡ component thì hủy yêu cầu đang bay và không đặt timer mới", async () => {
  let signal: AbortSignal | undefined;
  const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => { signal = init.signal as AbortSignal; return new Promise(() => undefined); });
  vi.stubGlobal("fetch", fetchMock);
  const { unmount } = renderHook(() => usePendingSale(wire() as unknown as PendingSale, ask));
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("gỡ component trong lúc đang chờ nhịp thì không hỏi lần nào", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const { unmount } = renderHook(() => usePendingSale(wire() as unknown as PendingSale, ask));
  unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
  expect(fetchMock).not.toHaveBeenCalled();
});

it("lỗi mạng liên tiếp thì lùi nhịp rồi ngừng tự hỏi (stalled) thay vì hỏi mãi", async () => {
  const fetchMock = vi.fn().mockImplementation(() => Promise.reject(new TypeError("network")));
  vi.stubGlobal("fetch", fetchMock);
  const { result } = renderHook(() => usePendingSale(wire() as unknown as PendingSale, ask));
  await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60_000); });
  expect(result.current.poll.phase).toBe("stalled");
  expect(fetchMock).toHaveBeenCalledTimes(6);
  await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60_000); });
  expect(fetchMock).toHaveBeenCalledTimes(6);
});

it("dừng bán lỗi không chắc chắn: không gửi lại, đọc trạng thái thật rồi theo kết quả", async () => {
  const calls: string[] = [];
  const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit) => {
    calls.push(`${init.method} ${url}`);
    if (init.method === "POST") return Promise.reject(new TypeError("network")); // không rõ backend đã nhận chưa
    return reply(wire({ status: "Stopped", endedAt: "2026-11-09T03:01:00+07:00" }));
  });
  vi.stubGlobal("fetch", fetchMock);
  const { result } = renderHook(() => usePendingSale(wire() as unknown as PendingSale, ask));
  await act(async () => { await result.current.stop(); });
  expect(calls.filter((c) => c.startsWith("POST"))).toHaveLength(1);
  expect(calls.at(-1)).toMatch(/^GET .*code=HD000124&action=pending/);
  expect(result.current.poll.phase).toBe("stopped");
  expect(result.current.error).toBeUndefined();
});
