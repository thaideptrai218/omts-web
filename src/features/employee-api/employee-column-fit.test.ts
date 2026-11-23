import { describe, expect, it } from "vitest";
import { fitColumns, usernameColumnWidth } from "./employee-column-fit";

const widths: Record<string, number> = { name: 150, username: 160, phone: 112, type: 118, zones: 112, hours: 84, debt: 108, status: 132 };
const all = Object.keys(widths), widthOf = (key: string) => widths[key] ?? 100;

describe("employee list column fit", () => {
  it("keeps everything when the pane is wide enough or not measured yet", () => {
    expect(fitColumns(all, widthOf, 0, 56)).toEqual(all);
    expect(fitColumns(all, widthOf, 1200, 56)).toEqual(all);
  });
  it("drops the least important columns first and never the name, username or status", () => {
    const narrow = fitColumns(all, widthOf, 800, 56);
    expect(narrow).not.toContain("hours");
    expect(narrow).toContain("name"); expect(narrow).toContain("username"); expect(narrow).toContain("status");
    expect(narrow.reduce((sum, key) => sum + widthOf(key), 56)).toBeLessThanOrEqual(800);
    const tiny = fitColumns(all, widthOf, 300, 56);
    expect(tiny).toEqual(["name", "username", "status"]);
  });
  it("sizes the username column to the longest login name within a range", () => {
    expect(usernameColumnWidth([])).toBe(120);
    expect(usernameColumnWidth(["@a"])).toBe(120);
    expect(usernameColumnWidth(["@nhanvien.chuaxacthuc"])).toBe(22 * 7 + 20);
    expect(usernameColumnWidth(["@" + "x".repeat(80)])).toBe(200);
  });
});
