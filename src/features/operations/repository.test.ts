import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createOperationsRepository } from "./repository";
afterEach(() => vi.restoreAllMocks());
describe("operation response outcomes", () => {
  it.each(["network", "503", "invalid-success"])("does not label a failed %s read as an uncertain write", async (kind) => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    if (kind === "network") fetcher.mockRejectedValue(new TypeError("QA network unavailable"));
    else fetcher.mockResolvedValue(kind === "invalid-success" ? Response.json({ status: "success", data: {} })
      : Response.json({ status: "unavailable" }, { status: Number(kind) }));
    const result = await createOperationsRepository("supplier-payments").read("debt", {}, z.object({ required: z.string() }));
    expect(result.status).toBe("error"); if (result.status === "error") expect(result.uncertain).toBe(false);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("tries to renew the session once for a 401 read and, when renewal is refused, reports a certain failure", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ status: "session-expired" }, { status: 401 }));
    const result = await createOperationsRepository("supplier-payments").read("debt", {}, z.object({ required: z.string() }));
    expect(result).toEqual({ status: "error", httpStatus: 401, code: undefined, uncertain: false });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[0][0])).toContain("/api/operations/supplier-payments");
    expect(fetcher.mock.calls[1][0]).toBe("/api/auth/refresh");
  });
  it.each(["network", "503", "invalid-success"])("retains uncertainty for a %s write and never replays it", async (kind) => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    if (kind === "network") fetcher.mockRejectedValue(new TypeError("QA network unavailable"));
    else fetcher.mockResolvedValue(kind === "invalid-success" ? Response.json({ status: "success", data: {} })
      : Response.json({ status: "unavailable" }, { status: Number(kind) }));
    const result = await createOperationsRepository("supplier-payments").write("record", {}, z.object({ required: z.string() }));
    expect(result.status).toBe("error"); if (result.status === "error") expect(result.uncertain).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("does not replay a write when session expiry may have happened after commit", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ status: "session-expired" }, { status: 401 }));
    const result = await createOperationsRepository("supplier-payments").write("record", {}, z.object({}));
    expect(result).toEqual({ status: "error", httpStatus: 401, code: undefined, uncertain: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("keeps a preflight-forbidden write separate from an ambiguous outcome", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ status: "forbidden", code: "MSG02" }, { status: 403 }));
    expect(await createOperationsRepository("water").write("record", {}, z.object({}))).toEqual({ status: "error", httpStatus: 403, code: "MSG02", uncertain: false });
  });
});

import { suggestedFileName } from "./repository";
describe("tên tệp tải về", () => {
  it("dùng tên do BFF đặt khi an toàn, bỏ qua tên lạ", () => {
    expect(suggestedFileName('attachment; filename="hoa-don-1a2b3c4d.xlsx"')).toBe("hoa-don-1a2b3c4d.xlsx");
    expect(suggestedFileName('attachment; filename="sales-invoice-list-20261109.xlsx"')).toBe("sales-invoice-list-20261109.xlsx");
    expect(suggestedFileName('attachment; filename="../x.exe"')).toBeUndefined();
    expect(suggestedFileName(null)).toBeUndefined();
  });
});
