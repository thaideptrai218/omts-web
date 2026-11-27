import { describe, expect, it } from "vitest";
import { failure, isTileFailure } from "./vietmap-view";

describe("isTileFailure", () => {
  it("treats a missing vector tile as a gap, not a map failure", () => {
    expect(isTileFailure({ sourceId: "openmaptiles", tile: {}, error: { status: 404, url: "https://maps.vietmap.vn/maps/tiles/vlc/17/1/2.pbf" } })).toBe(true);
    expect(isTileFailure({ error: { status: 404, url: "https://maps.vietmap.vn/maps/tiles/st/17/1/2.png" } })).toBe(true);
  });
  it("still reports style, access and quota failures", () => {
    expect(isTileFailure({ error: { status: 404, url: "https://maps.vietmap.vn/maps/styles/hm/style.json" } })).toBe(false);
    expect(isTileFailure({ sourceId: "openmaptiles", error: { status: 403 } })).toBe(false);
    expect(isTileFailure({ sourceId: "openmaptiles", error: { status: 429 } })).toBe(false);
    expect(isTileFailure(undefined)).toBe(false);
    expect(failure({ error: { status: 429 } })).toContain("giới hạn");
  });
});
