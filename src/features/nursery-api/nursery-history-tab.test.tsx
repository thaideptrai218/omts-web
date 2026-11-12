// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const history = vi.hoisted(() => vi.fn());
vi.mock("./service", () => ({ nurseryService: { history } }));
import { NurseryHistoryTab } from "./nursery-history-tab";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("nursery compact history", () => {
  it("keeps every row closed until clicked, then shows changes and reason", async () => {
    history.mockResolvedValue({ status: "success", data: { entries: [
      { at: "2026-11-13T08:30:00+07:00", byName: "Nguyễn An", action: "SurvivorsCorrected", reason: "Đếm lại", changes: [{ field: "Survivors", from: 900, to: 950, unit: "mảnh" }] },
      { at: "2026-11-13T09:30:00+07:00", byName: "Nguyễn An", action: "Completed", reason: "Đã chuyển phân bổ cho bè", changes: [] },
    ] } });
    render(<NurseryHistoryTab id="n" zoneId="z" />);
    const first = await screen.findByRole("button", { name: /Sửa số sống sót 900 → 950/ });
    const second = screen.getByRole("button", { name: /Hoàn tất ươm/ });
    expect(first.getAttribute("aria-expanded")).toBe("false");
    expect(first.getAttribute("type")).toBe("button");
    expect(second.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Lý do: Đếm lại")).toBeNull();
    fireEvent.click(first);
    expect(first.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Lý do: Đếm lại")).toBeTruthy();
    expect(screen.getByText("Sống sót (ước tính) (mảnh)")).toBeTruthy();
    expect(screen.getByText("900 → 950")).toBeTruthy();
    expect(second.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(first);
    expect(screen.queryByText("Lý do: Đếm lại")).toBeNull();
    expect(history).toHaveBeenCalledWith("n", "z", expect.any(AbortSignal));
  });
  it("offers retry after a load error and shows the empty state", async () => {
    history.mockResolvedValueOnce({ status: "error", httpStatus: 503 }).mockResolvedValue({ status: "success", data: { entries: [] } });
    render(<NurseryHistoryTab id="n" zoneId="z" />);
    fireEvent.click(await screen.findByRole("button", { name: "Tải lại lịch sử" }));
    expect(await screen.findByText("Chưa có thay đổi nào được ghi lại.")).toBeTruthy();
  });
});
