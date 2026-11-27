// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const history = vi.hoisted(() => vi.fn());
vi.mock("./service", () => ({ nurseryService: { history } }));
import { NurseryHistoryTab } from "./nursery-history-tab";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("nursery history table", () => {
  it("lists the events in the shared table with the nursery wording", async () => {
    history.mockResolvedValue({ status: "success", data: { entries: [
      { at: "2026-11-13T08:30:00+07:00", byName: "Nguyễn An", byRole: "Kế toán", action: "SurvivorsCorrected", reason: "Đếm lại", changes: [{ field: "Survivors", from: 900, to: 950, unit: "mảnh" }] },
      { at: "2026-11-13T09:30:00+07:00", byName: "Nguyễn An", action: "Completed", reason: "Đã chuyển phân bổ cho bè", changes: [] },
    ] } });
    render(<NurseryHistoryTab id="n" zoneId="z" />);
    expect(await screen.findByRole("table", { name: "Lịch sử thay đổi" })).toBeTruthy();
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    // Newest first.
    expect(within(rows[0]).getAllByRole("cell")[1].textContent).toBe("Hoàn tất ươm");
    expect(within(rows[1]).getAllByRole("cell")[1].textContent).toBe("Sửa số sống sót (ước tính)");
    expect(within(rows[1]).getAllByRole("cell")[3].textContent).toBe("Sống sót (ước tính) (mảnh): 900 → 950");
    expect(within(rows[1]).getAllByRole("cell")[4].textContent).toBe("Đếm lại");
    expect(within(rows[0]).getAllByRole("cell")[4].textContent).toBe("Thông tin đợt ươm đã thay đổi. Hãy tải lại để đối chiếu.");
    expect(history).toHaveBeenCalledWith("n", "z", expect.any(AbortSignal));
  });
  it("offers retry after a load error and shows the empty state", async () => {
    history.mockResolvedValueOnce({ status: "error", httpStatus: 503 }).mockResolvedValue({ status: "success", data: { entries: [] } });
    render(<NurseryHistoryTab id="n" zoneId="z" />);
    fireEvent.click(await screen.findByRole("button", { name: "Tải lại lịch sử" }));
    expect(await screen.findByText("Chưa có thay đổi nào được ghi lại.")).toBeTruthy();
  });
});
