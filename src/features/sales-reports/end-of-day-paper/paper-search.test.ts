import { describe, expect, it } from "vitest";
import type { EodTable } from "../end-of-day-model";
import { cell } from "../end-of-day-model";
import type { FlowEntry } from "./paper-flow";
import { findMatches, foldText, splitMatches, stepMatch } from "./paper-search";
import { canGoBack, canGoForward, currentState, moveHistory, recordState, startHistory } from "./viewer-history";

const table: EodTable = { id: "t", title: "Bán hàng", columns: [], rows: [], emptyText: "", total: [cell("Tổng")] };
const entries: FlowEntry[] = [
  { key: "head", type: "head", head: { createdAt: "x", title: "Báo cáo cuối ngày về bán hàng", lines: ["Khách hàng: Nguyễn Văn Hàu"] } },
  { key: "r1", type: "row", table, row: { key: "r1", role: "item", cells: [cell("HD000001"), cell("Hàu sữa, hàu béo")] } },
  { key: "r2", type: "row", table, row: { key: "r2", role: "item", cells: [cell("HD000002"), cell("Cá")] } },
];
const pages = [{ keys: ["head", "r1"] }, { keys: ["r2"] }];

describe("tìm trong trang", () => {
  it("bỏ dấu tiếng Việt và hoa thường nhưng giữ nguyên độ dài chuỗi", () => {
    expect(foldText("Đắk Lắk Hàu")).toBe("dak lak hau");
    expect(foldText("Nguyễn").length).toBe("Nguyễn".length);
  });
  it("tách đoạn khớp không phân biệt dấu và hoa thường, giữ nguyên chữ gốc", () => {
    expect(splitMatches("Hàu sữa, hàu béo", "HAU")).toEqual([
      { text: "Hàu", hit: true }, { text: " sữa, ", hit: false }, { text: "hàu", hit: true }, { text: " béo", hit: false },
    ]);
    expect(splitMatches("Cá", "")).toEqual([{ text: "Cá", hit: false }]);
  });
  it("liệt kê mọi lần khớp theo thứ tự hiển thị kèm số trang", () => {
    const matches = findMatches(entries, pages, "hau");
    expect(matches.map(({ key, cell: at, nth, page }) => [key, at, nth, page])).toEqual([["head", 1, 0, 1], ["r1", 1, 0, 1], ["r1", 1, 1, 1]]);
    expect(findMatches(entries, pages, "hd000002")).toEqual([{ key: "r2", cell: 0, nth: 0, page: 2 }]);
    expect(findMatches(entries, pages, "  ")).toEqual([]);
    expect(findMatches(entries, pages, "không có")).toEqual([]);
  });
  it("phần tử chưa nằm trong trang nào bị bỏ qua", () => {
    expect(findMatches(entries, [{ keys: ["head"] }], "hd00")).toEqual([]);
  });
  it("kết quả kế tiếp/trước quay vòng", () => {
    expect(stepMatch(0, 1, 3)).toBe(1);
    expect(stepMatch(2, 1, 3)).toBe(0);
    expect(stepMatch(0, -1, 3)).toBe(2);
    expect(stepMatch(0, 1, 0)).toBe(0);
  });
});

describe("lịch sử Quay lại / Tới", () => {
  it("ghi trạng thái mới, lùi và tới", () => {
    let history = startHistory({ n: 1 });
    expect([canGoBack(history), canGoForward(history)]).toEqual([false, false]);
    history = recordState(history, { n: 2 });
    history = recordState(history, { n: 3 });
    expect(currentState(history)).toEqual({ n: 3 });
    history = moveHistory(history, -1);
    expect(currentState(history)).toEqual({ n: 2 });
    expect([canGoBack(history), canGoForward(history)]).toEqual([true, true]);
    history = moveHistory(history, 1);
    expect(currentState(history)).toEqual({ n: 3 });
    expect(moveHistory(history, 1)).toBe(history);
  });
  it("trạng thái trùng bản hiện tại không ghi thêm (kể cả sau khi lùi)", () => {
    const history = recordState(startHistory({ n: 1 }), { n: 2 });
    expect(recordState(history, { n: 2 })).toBe(history);
    const back = moveHistory(history, -1);
    expect(recordState(back, { n: 1 })).toBe(back);
  });
  it("ghi trạng thái mới sau khi lùi thì bỏ phần Tới cũ", () => {
    let history = recordState(recordState(startHistory({ n: 1 }), { n: 2 }), { n: 3 });
    history = moveHistory(moveHistory(history, -1), -1);
    history = recordState(history, { n: 9 });
    expect(history.entries.map((entry) => entry.value)).toEqual([{ n: 1 }, { n: 9 }]);
    expect(canGoForward(history)).toBe(false);
  });
  it("chỉ giữ tối đa 50 bản chụp", () => {
    let history = startHistory({ n: 0 });
    for (let n = 1; n <= 80; n++) history = recordState(history, { n });
    expect(history.entries).toHaveLength(50);
    expect(currentState(history)).toEqual({ n: 80 });
  });
});
