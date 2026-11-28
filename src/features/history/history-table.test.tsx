// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { historyActionLabel, historyChangeStyle, historyChangeText, historyValue, historyValueWithUnit, isBlankHistoryValue, type HistoryEntry } from "./history-contracts";
import { HistoryTable } from "./history-table";

afterEach(cleanup);
const entry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({ at: "2026-11-27T10:05:00+07:00", action: "HarvestLot.Corrected", changes: [], ...overrides });
const rows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);

describe("history table", () => {
  it("is a table with the five columns and no stacked cards", () => {
    render(<HistoryTable entries={[entry({ actionLabel: "Chỉnh sửa", byName: "Nguyễn An", byRole: "Quản lý vùng", reason: "Nhập nhầm", changes: [{ field: "CageCount", label: "Số lồng", from: "4", to: "5", unit: "lồng" }] })]} />);
    expect(screen.getAllByRole("columnheader").map(header => header.textContent?.replace(/\s*[↑↓]$/, ""))).toEqual(["Thời gian", "Thao tác", "Người thực hiện", "Nội dung thay đổi", "Lý do"]);
    const cells = within(rows()[0]).getAllByRole("cell");
    expect(cells[0].textContent).toBe("27/11/2026 10:05");
    expect(cells[1].textContent).toBe("Chỉnh sửa");
    expect(cells[2].textContent).toBe("Nguyễn AnQuản lý vùng");
    expect(cells[3].textContent).toBe("Số lồng: 4 lồng → 5 lồng");
    expect(cells[4].textContent).toBe("Nhập nhầm");
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByRole("navigation", { name: "Phân trang" })).toBeTruthy();
  });

  it("prefers the backend action label and never shows an English action", () => {
    render(<HistoryTable entries={[
      entry({ at: "2026-11-27T10:00:00+07:00", action: "Published", actionLabel: "Công khai truy xuất" }),
      entry({ at: "2026-11-27T09:00:00+07:00", action: "HarvestLot.Published" }),
      entry({ at: "2026-11-27T08:00:00+07:00", action: "HarvestLot.Frobnicated", actionLabel: "Frobnicated" }),
      entry({ at: "2026-11-27T07:00:00+07:00", action: "Whatever" }),
    ]} />);
    expect(rows().map(row => within(row).getAllByRole("cell")[1].textContent)).toEqual(["Công khai truy xuất", "Công khai truy xuất", "Thay đổi", "Thay đổi"]);
    expect(screen.queryByText(/Published|Frobnicated/)).toBeNull();
  });

  it("translates leftover codes, formats dates and hides ids and empty creation fields", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    render(<HistoryTable entries={[entry({ changes: [
      { field: "OriginState", label: "Truy xuất nguồn gốc", from: "NotPublished", to: "Published" },
      { field: "Status", label: "Trạng thái", from: "OPEN", to: "CLOSED" },
      { field: "CloseReason", label: "Lý do chốt lô", from: null, to: "SoldWholeLot" },
      { field: "PublishedAt", label: "Thời điểm công khai", from: null, to: "2026-11-27T03:05:00+00:00" },
      { field: "ClosedBySalesInvoiceId", label: "Hóa đơn chốt lô", from: null, to: id },
      { field: "Photos", label: "Ảnh", from: null, to: null },
      { field: "Photos2", label: "Ảnh", from: "", to: "" },
    ] })]} />);
    fireEvent.click(screen.getByRole("button", { name: "+1 thay đổi khác" }));
    const text = rows()[0].textContent ?? "";
    for (const expected of ["Chưa công khai → Đã công khai", "Đang mở → Đã kết thúc", "Bán hết lô", "27/11/2026 10:05"]) expect(text).toContain(expected);
    expect(text).not.toMatch(/OPEN|CLOSED|NotPublished|SoldWholeLot|Published|00000000-0000|— → —/);
    expect(text).not.toContain("Hóa đơn chốt lô");
  });

  it("shows a creation as Label: value", () => {
    render(<HistoryTable entries={[entry({ action: "HarvestLot.Created", actionLabel: "Tạo mới", changes: [
      { field: "CageCount", label: "Số lồng", from: null, to: 12.5, unit: "lồng" }, { field: "LotCode", label: "Mã lô", from: null, to: "LH01" }, { field: "Photos", label: "Ảnh", from: null, to: "" },
    ] })]} />);
    const lines = within(within(rows()[0]).getAllByRole("cell")[3]).getAllByText(/:/).map(node => node.textContent);
    expect(lines).toEqual(["Số lồng: 12,5 lồng", "Mã lô: LH01"]);
  });

  it("lists three changes and opens the rest with +n", () => {
    const changes = ["A", "B", "C", "D", "E"].map(letter => ({ field: letter, label: `Trường ${letter}`, from: "1", to: "2" }));
    render(<HistoryTable entries={[entry({ changes })]} />);
    expect(screen.getAllByText(/Trường/)).toHaveLength(3);
    const more = screen.getByRole("button", { name: "+2 thay đổi khác" });
    fireEvent.click(more);
    expect(screen.getAllByText(/Trường/)).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Thu gọn" }));
    expect(screen.getAllByText(/Trường/)).toHaveLength(3);
  });

  it("is newest first, the header flips it, and a note shows under the changes", () => {
    render(<HistoryTable entries={[
      entry({ at: "2026-11-01T08:00:00+07:00", actionLabel: "Tạo mới" }),
      entry({ at: "2026-11-20T08:00:00+07:00", actionLabel: "Chỉnh sửa", note: "Lô đã công khai bị ảnh hưởng: LH01" }),
    ]} />);
    const order = () => rows().map(row => within(row).getAllByRole("cell")[1].textContent);
    expect(order()).toEqual(["Chỉnh sửa", "Tạo mới"]);
    expect(screen.getByText("Lô đã công khai bị ảnh hưởng: LH01")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Thời gian/ }));
    expect(order()).toEqual(["Tạo mới", "Chỉnh sửa"]);
    expect(screen.getByRole("columnheader", { name: /Thời gian/ }).getAttribute("aria-sort")).toBe("ascending");
  });

  it("pages like the other tables", () => {
    const many = Array.from({ length: 12 }, (_, index) => entry({ at: `2026-11-${String(index + 10).padStart(2, "0")}T08:00:00+07:00`, actionLabel: `Lần ${index + 1}` }));
    render(<HistoryTable entries={many} />);
    expect(rows()).toHaveLength(10);
    expect(rows()[0].textContent).toContain("Lần 12");
    expect(screen.getByText("1–10 trong 12 thay đổi")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    expect(rows().map(row => within(row).getAllByRole("cell")[1].textContent)).toEqual(["Lần 2", "Lần 1"]);
  });

  it("says so when nothing changed and uses the system as the actor of an event nobody did", () => {
    const { unmount } = render(<HistoryTable entries={[]} />);
    expect(screen.getByText("Chưa có thay đổi nào được ghi lại.")).toBeTruthy();
    unmount();
    render(<HistoryTable entries={[entry({ actionLabel: "Tạo mới" })]} />);
    expect(within(rows()[0]).getAllByRole("cell")[2].textContent).toBe("Hệ thống");
    expect(within(rows()[0]).getAllByRole("cell")[3].textContent).toBe("—");
  });
});

describe("history wording", () => {
  it("falls back to a Vietnamese action, never to the code", () => {
    expect(historyActionLabel("HarvestLot.Published")).toBe("Công khai truy xuất");
    expect(historyActionLabel("Published", "Published")).toBe("Công khai truy xuất");
    expect(historyActionLabel("Nope", "Nope")).toBe("Thay đổi");
    expect(historyActionLabel("Nope", "Đã làm gì đó")).toBe("Đã làm gì đó");
  });
  it("translates codes and dates, and treats an id as nothing", () => {
    expect(historyValue("NotPublished")).toBe("Chưa công khai");
    expect(historyValue("2026-11-20")).toBe("20/11/2026");
    expect(historyValue("2026-11-27T03:05:00+00:00")).toBe("27/11/2026 10:05");
    expect(historyValue("c9b0e4d5-8ba1-4124-ada0-386c2dbabf35")).toBe("—");
    expect(isBlankHistoryValue("c9b0e4d5-8ba1-4124-ada0-386c2dbabf35")).toBe(true);
    expect(isBlankHistoryValue("0")).toBe(false);
  });
  it("adds a unit to numbers only", () => {
    expect(historyValueWithUnit(1200.5, "kg")).toBe("1.200,5 kg");
    expect(historyValueWithUnit("1.234,5", "kg")).toBe("1.234,5 kg");
    expect(historyValueWithUnit("Đang mở", "kg")).toBe("Đang mở");
    expect(historyValueWithUnit(null, "kg")).toBe("—");
  });
  it("reads a creation as Label: value and an edit as Label: from → to", () => {
    const set = [{ field: "A", label: "Số lồng", from: null, to: 5 }];
    expect(historyChangeStyle(set)).toBe("set");
    expect(historyChangeText(set[0], "set")).toBe("Số lồng: 5");
    expect(historyChangeStyle([{ field: "A", from: 4, to: 5 }, ...set])).toBe("arrow");
    expect(historyChangeText({ field: "A", label: "Số lồng", from: 4, to: 5 })).toBe("Số lồng: 4 → 5");
  });
});
