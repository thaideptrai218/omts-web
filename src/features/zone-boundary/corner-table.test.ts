import { describe, expect, it } from "vitest";
import type { ZoneMapReading } from "./boundary-contract";
import { areaDraft, cornerDraft } from "./boundary-geometry";
import { draftsFromReading, mergeAreas, suggestedAreaHa } from "./corner-table";

const corner = (label: string, x: number | null, y: number | null, lat: string | null = null, lon: string | null = null) => ({ label, x, y, lat, lon });
const zone = (name: string | null, writtenAreaHa: number | null, corners: ReturnType<typeof corner>[]) => ({ name, writtenAreaHa, gridAreaHa: null, areaMatches: null, corners });
const reading = (over: Partial<ZoneMapReading> = {}): ZoneMapReading => ({
  centralMeridian: 107.75, coordinateSystem: "VN-2000", location: "  Xã Đông Xá, huyện Vân Đồn ", writtenTotalAreaHa: 28.5,
  zones: [
    zone("Khu 1", 12.5, [corner("K1", 2315876.23, 437512.47), corner(" K2 ", 2315976.23, 437512.47), corner("K3", 2315976.23, 437612.47)]),
    zone(null, 6.2, [corner("K4", 2315900, 437700)]),
    zone("Khu 3", null, []),
  ], ...over,
});

describe("reading to drafts", () => {
  it("builds khu with X, Y to two decimals, trimmed names and the location", () => {
    const drafts = draftsFromReading(reading());
    expect(drafts.centralMeridian).toBe(107.75);
    expect(drafts.location).toBe("Xã Đông Xá, huyện Vân Đồn");
    expect(drafts.areaHa).toBe(28.5);
    expect(drafts.areas.map(area => area.name)).toEqual(["Khu 1", "Khu 2"]);
    expect(drafts.areas[0].writtenAreaHa).toBe(12.5);
    expect(drafts.areas[0].corners.map(item => [item.label, item.x, item.y])).toEqual([["K1", "2315876.23", "437512.47"], ["K2", "2315976.23", "437512.47"], ["K3", "2315976.23", "437612.47"]]);
  });
  it("computes X, Y from latitude and longitude written on a row that has none", () => {
    const sample = reading({ zones: [zone("Khu 1", null, [corner("K1", null, null, "20°56'09.59\"", "107°08'57.09\"")])] });
    const [first] = draftsFromReading(sample).areas[0].corners;
    expect(Math.abs(Number(first.x) - 2315876.23)).toBeLessThan(3);
    expect(Math.abs(Number(first.y) - 437512.47)).toBeLessThan(3);
    const unreadable = draftsFromReading(reading({ zones: [zone("Khu 1", null, [corner("K1", null, null, "?", null)])] }));
    expect(unreadable.areas[0].corners[0]).toMatchObject({ x: "", y: "" });
  });
  it("has no meridian or location when the photo shows none", () => {
    const drafts = draftsFromReading(reading({ centralMeridian: null, location: null, writtenTotalAreaHa: null }));
    expect(drafts.centralMeridian).toBeNull();
    expect(drafts.location).toBeNull();
  });
});

describe("suggested area", () => {
  it("takes the written total, else the sum of the written khu areas, else nothing", () => {
    expect(suggestedAreaHa(28.5, [12.5, 6.2])).toBe(28.5);
    expect(suggestedAreaHa(null, [12.5, 6.2, null])).toBe(18.7);
    expect(suggestedAreaHa(0, [12.5])).toBe(12.5);
    expect(suggestedAreaHa(null, [null])).toBeNull();
    expect(suggestedAreaHa(null, [])).toBeNull();
  });
  it("follows the reading: the sum of the khu when the total row is unread", () => {
    expect(draftsFromReading(reading({ writtenTotalAreaHa: null })).areaHa).toBe(18.7);
  });
});

describe("merging a new read", () => {
  it("replaces the corners of a khu with the same name and appends the others", () => {
    const current = [areaDraft("Khu 1", [cornerDraft("old", 1, 2)]), areaDraft("Khu 9", [cornerDraft("keep", 3, 4)])];
    const merged = mergeAreas(current, draftsFromReading(reading()).areas);
    expect(merged.map(area => area.name)).toEqual(["Khu 1", "Khu 9", "Khu 2"]);
    expect(merged[0].key).toBe(current[0].key);
    expect(merged[0].corners).toHaveLength(3);
    expect(merged[1].corners[0].label).toBe("keep");
  });
});
