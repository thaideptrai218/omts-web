import { describe, expect, it } from "vitest";
import { fitColumns, usernameColumnWidth } from "./employee-column-fit";

const widths: Record<string, number> = { code: 112, name: 150, username: 160, phone: 112, type: 118, zones: 112, salaryType: 84, debt: 108, status: 132 };
const all = Object.keys(widths), widthOf = (key: string) => widths[key] ?? 100;

describe("employee list column fit", () => {
  it("keeps everything when the pane is wide enough or not measured yet", () => {
    expect(fitColumns(all, widthOf, 0, 56)).toEqual(all);
    expect(fitColumns(all, widthOf, 1200, 56)).toEqual(all);
  });
  it("drops only the optional columns when the pane is narrow; the default ones stay and the list scrolls", () => {
    const narrow = fitColumns(all, widthOf, 800, 56);
    expect(narrow).not.toContain("username");
    for (const key of ["code", "name", "phone", "type", "zones", "salaryType", "debt", "status"]) expect(narrow).toContain(key);
    expect(fitColumns(["code", "name", "birthday", "address", "status"], key => key === "address" ? 220 : 100, 400, 56)).toEqual(["code", "name", "status"]);
  });
  it("sizes the username column to the longest login name within a range", () => {
    expect(usernameColumnWidth([])).toBe(120);
    expect(usernameColumnWidth(["@a"])).toBe(120);
    expect(usernameColumnWidth(["@nhanvien.chuaxacthuc"])).toBe(22 * 7 + 20);
    expect(usernameColumnWidth(["@" + "x".repeat(80)])).toBe(200);
  });
});
