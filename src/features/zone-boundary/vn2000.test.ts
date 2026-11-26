import { describe, expect, it } from "vitest";
import { DEFAULT_CENTRAL_MERIDIAN, dmsText, gridToVn2000, meridianText, parseDms, vn2000ToGrid, vn2000ToWgs84, wgs84ToVn2000 } from "./vn2000";

// Vân Đồn sample (licence map 26/11/2026), corner K1, central meridian 107°45'. Expected values come from running the mobile
// app's `vn2000.ts` on the same input; the two copies must keep agreeing to 6 decimals.
const K1 = { x: 2315876.23, y: 437512.47 };
const K1_VN2000 = { latitude: 20.935997756435974, longitude: 107.14919121258286 };
const K1_WGS84 = { latitude: 20.934996973595144, longitude: 107.15106903922836 };

describe("VN-2000 conversion", () => {
  it("turns the sample corner K1 into the same VN-2000 and WGS84 position as the mobile app", () => {
    const vn2000 = gridToVn2000(K1.x, K1.y, DEFAULT_CENTRAL_MERIDIAN);
    expect(vn2000.latitude).toBeCloseTo(K1_VN2000.latitude, 6);
    expect(vn2000.longitude).toBeCloseTo(K1_VN2000.longitude, 6);
    const wgs84 = vn2000ToWgs84(vn2000);
    expect(wgs84.latitude).toBeCloseTo(K1_WGS84.latitude, 6);
    expect(wgs84.longitude).toBeCloseTo(K1_WGS84.longitude, 6);
  });
  it("moves a point about 200 m between the two systems (the paper numbers are never used as GPS)", () => {
    const wgs84 = vn2000ToWgs84(K1_VN2000);
    const metres = Math.hypot((wgs84.latitude - K1_VN2000.latitude) * 110574, (wgs84.longitude - K1_VN2000.longitude) * 111320 * Math.cos(0.365));
    expect(metres).toBeGreaterThan(150);
    expect(metres).toBeLessThan(250);
  });
  it("round-trips WGS84 back to the printed X, Y within a millimetre", () => {
    const back = vn2000ToGrid(wgs84ToVn2000(K1_WGS84), DEFAULT_CENTRAL_MERIDIAN);
    expect(Math.abs(back.x - K1.x)).toBeLessThan(0.01);
    expect(Math.abs(back.y - K1.y)).toBeLessThan(0.01);
  });
});

describe("degrees, minutes, seconds", () => {
  it("formats and reads the central meridian", () => {
    expect(meridianText(107.75)).toBe("107°45'");
    expect(parseDms("107°45'")).toBe(107.75);
    expect(parseDms("107 45")).toBe(107.75);
    expect(parseDms("107.75")).toBe(107.75);
    expect(parseDms("107°45'30\"")).toBeCloseTo(107.758333, 6);
  });
  it("round-trips the seconds as printed on the map", () => {
    expect(dmsText(K1_VN2000.latitude)).toBe("20°56'09.59\"");
    expect(parseDms("20°56'09.59\"")).toBeCloseTo(K1_VN2000.latitude, 5);
  });
  it("refuses minutes or seconds of 60 and text that is not an angle", () => {
    expect(parseDms("107°60'")).toBeNull();
    expect(parseDms("107°45'61\"")).toBeNull();
    expect(parseDms("abc")).toBeNull();
    expect(parseDms("")).toBeNull();
  });
});
