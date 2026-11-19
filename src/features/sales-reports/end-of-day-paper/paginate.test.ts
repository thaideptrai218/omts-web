import { describe, expect, it } from "vitest";
import { clampPage, pageGeometry, paginate, type FlowItem } from "./paginate";

const row = (key: string, height: number, table = "t"): FlowItem => ({ key, height, table });
const keys = (pages: ReturnType<typeof paginate>) => pages.map((page) => page.keys.join(","));

describe("paginate", () => {
  it("một trang rỗng khi không có phần tử", () => {
    expect(paginate([], 500, {})).toEqual([{ keys: [] }]);
  });
  it("gộp vào một trang khi vừa chiều cao (cộng cả tiêu đề bảng một lần)", () => {
    // tiêu đề 20 + 4 dòng x 20 = 100 <= 100
    expect(keys(paginate([row("a", 20), row("b", 20), row("c", 20), row("d", 20)], 100, { t: 20 }))).toEqual(["a,b,c,d"]);
  });
  it("chia trang khi dòng kế tiếp không vừa; trang sau cộng lại chiều cao tiêu đề lặp", () => {
    // trang 1: 20 + 3x20 = 80 (dòng d sẽ thành 100 > 90); trang 2: 20 + d + e = 60
    const pages = paginate([row("a", 20), row("b", 20), row("c", 20), row("d", 20), row("e", 20)], 90, { t: 20 });
    expect(keys(pages)).toEqual(["a,b,c", "d,e"]);
  });
  it("tiêu đề lặp làm trang sau chứa ít dòng hơn", () => {
    // mỗi trang 100: trang 1 = 30 (tiêu đề) + 3 dòng 20 = 90; dòng 4 -> 110 > 100.
    const items = Array.from({ length: 10 }, (_, n) => row(`r${n}`, 20));
    const pages = paginate(items, 100, { t: 30 });
    expect(pages.map((page) => page.keys.length)).toEqual([3, 3, 3, 1]);
  });
  it("tiêu đề bảng và dòng đầu đi cùng nhau: không bỏ tiêu đề lại cuối trang", () => {
    const items: FlowItem[] = [{ key: "block", height: 60 }, { key: "title", height: 20, keepWithNext: true }, row("r1", 20), row("r2", 20)];
    // trang chứa block(60) + title(20) = 80; title kéo theo r1 (20 + tiêu đề 15) -> 80 + 35 = 115 > 100: title sang trang 2
    expect(keys(paginate(items, 100, { t: 15 }))).toEqual(["block", "title,r1,r2"]);
  });
  it("khối không thuộc bảng không cộng tiêu đề; sau khối, dòng bảng cộng lại tiêu đề", () => {
    const items: FlowItem[] = [row("a", 10), { key: "note", height: 10 }, row("b", 10)];
    // a: 10+5, note: 10 -> 25, b: 10 + 5 (tiêu đề lại sau khối) = 40
    expect(keys(paginate(items, 39, { t: 5 }))).toEqual(["a,note", "b"]);
    expect(keys(paginate(items, 40, { t: 5 }))).toEqual(["a,note,b"]);
  });
  it("hai bảng liên tiếp mỗi bảng có tiêu đề riêng", () => {
    const items = [row("a1", 10, "A"), row("b1", 10, "B")];
    expect(keys(paginate(items, 35, { A: 10, B: 10 }))).toEqual(["a1", "b1"]);
    expect(keys(paginate(items, 40, { A: 10, B: 10 }))).toEqual(["a1,b1"]);
  });
  it("dòng cao hơn cả trang vẫn được đặt (trang riêng), không lặp vô hạn", () => {
    const pages = paginate([row("a", 10), row("huge", 500), row("b", 10)], 100, { t: 10 });
    expect(keys(pages)).toEqual(["a", "huge", "b"]);
  });
  it("giữ đủ mọi phần tử đúng một lần và theo thứ tự", () => {
    const items = Array.from({ length: 57 }, (_, n) => row(`r${n}`, 13 + (n % 5)));
    const pages = paginate(items, 120, { t: 18 });
    expect(pages.flatMap((page) => page.keys)).toEqual(items.map((item) => item.key));
  });
});

describe("pageGeometry và clampPage", () => {
  it("A4 dọc 210x297mm, ngang 297x210mm; nội dung trừ lề", () => {
    const portrait = pageGeometry("portrait"), landscape = pageGeometry("landscape");
    expect([portrait.widthMm, portrait.heightMm]).toEqual([210, 297]);
    expect([landscape.widthMm, landscape.heightMm]).toEqual([297, 210]);
    expect(portrait.contentWidth).toBeLessThan(portrait.width);
    expect(landscape.contentWidth).toBeGreaterThan(portrait.contentWidth);
    expect(landscape.contentHeight).toBeLessThan(portrait.contentHeight);
  });
  it("clampPage kéo số trang về 1..N và bỏ giá trị không phải số", () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(9, 5)).toBe(5);
    expect(clampPage(3.7, 5)).toBe(3);
    expect(clampPage(Number.NaN, 5)).toBe(1);
    expect(clampPage(2, 0)).toBe(1);
  });
});
