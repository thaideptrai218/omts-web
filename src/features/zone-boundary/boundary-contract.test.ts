import { describe, expect, it } from "vitest";
import { projectBoundaryWarnings, scanStatusSchema, zoneBoundarySchema } from "./boundary-contract";

const feature = { type: "Feature", properties: { name: "Khu 1", corners: ["K1", "K2", "K3"] }, geometry: { type: "Polygon", coordinates: [[[107.1, 20.9], [107.2, 20.9], [107.2, 21], [107.1, 20.9]]] } };

describe("zone boundary schema", () => {
  it("accepts the saved GeoJSON and drops an altitude", () => {
    const parsed = zoneBoundarySchema.parse({ type: "FeatureCollection", features: [{ ...feature, geometry: { type: "Polygon", coordinates: [[[107.1, 20.9, 0], [107.2, 20.9, 0], [107.2, 21, 0], [107.1, 20.9, 0]]] } }] });
    expect(parsed?.features[0].geometry.coordinates[0][0]).toEqual([107.1, 20.9]);
    expect(parsed?.features[0].properties?.corners).toEqual(["K1", "K2", "K3"]);
  });
  it.each([
    ["null", null], ["undefined", undefined], ["a string", "x"], ["a wrong type", { type: "Feature" }], ["no features", { type: "FeatureCollection", features: [] }],
    ["a ring of two points", { type: "FeatureCollection", features: [{ ...feature, geometry: { type: "Polygon", coordinates: [[[1, 2], [3, 4]]] } }] }],
    ["a text position", { type: "FeatureCollection", features: [{ ...feature, geometry: { type: "Polygon", coordinates: [[["a", 2], [3, 4], [5, 6]]] } }] }],
    ["eleven khu", { type: "FeatureCollection", features: Array.from({ length: 11 }, () => feature) }],
  ])("turns %s into null instead of failing the zone", (_name, value) => {
    expect(zoneBoundarySchema.parse(value)).toBeNull();
  });
  it("keeps a feature whose properties are malformed", () => {
    const parsed = zoneBoundarySchema.parse({ type: "FeatureCollection", features: [{ ...feature, properties: { name: 5, corners: "x" } }] });
    expect(parsed?.features[0].properties).toEqual({ name: null, corners: null });
  });
});

describe("scan status schema", () => {
  const reading = { centralMeridian: 107.75, coordinateSystem: "VN-2000", location: "Xã Đông Xá", writtenTotalAreaHa: 28.5,
    zones: [{ name: "Khu 1", writtenAreaHa: 12.5, gridAreaHa: 12.49, areaMatches: true, corners: [{ label: "K1", x: 2315876.23, y: 437512.47, lat: null, lon: null }] }] };
  it("reads a finished scan", () => {
    const parsed = scanStatusSchema.parse({ status: "Done", errorCode: null, reading });
    expect(parsed.reading?.zones[0].corners[0].x).toBe(2315876.23);
    expect(parsed.reading?.writtenTotalAreaHa).toBe(28.5);
  });
  it("fills missing optional values with null and keeps a failed scan's error code", () => {
    const parsed = scanStatusSchema.parse({ status: "Failed", errorCode: "TIMEOUT" });
    expect(parsed).toEqual({ status: "Failed", errorCode: "TIMEOUT", reading: null });
    const sparse = scanStatusSchema.parse({ status: "Done", reading: { zones: [{ corners: [{}] }] } });
    expect(sparse.reading?.zones[0]).toMatchObject({ name: null, writtenAreaHa: null, areaMatches: null });
    expect(sparse.reading?.zones[0].corners[0]).toEqual({ label: null, x: null, y: null, lat: null, lon: null });
  });
  it("rejects an unknown status", () => {
    expect(scanStatusSchema.safeParse({ status: "Weird" }).success).toBe(false);
  });
});

describe("boundary warnings", () => {
  it("keeps the rafts outside the new boundary and drops everything else", () => {
    expect(projectBoundaryWarnings({ warnings: [
      { code: "RAFTS_OUTSIDE_ZONE_BOUNDARY", details: { count: 2, raftCodes: ["B01", "B02"] } },
      { code: "SOMETHING_ELSE" }, "x",
    ] })).toEqual([{ code: "RAFTS_OUTSIDE_ZONE_BOUNDARY", details: { count: 2, raftCodes: ["B01", "B02"] } }]);
    expect(projectBoundaryWarnings({})).toEqual([]);
    expect(projectBoundaryWarnings(null)).toEqual([]);
  });
});
