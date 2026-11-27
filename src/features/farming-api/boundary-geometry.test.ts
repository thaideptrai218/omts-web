import { describe, expect, it } from "vitest";
import { boundaryRings, isOutsideBoundary, placementOf, placementText, pointInRing } from "./boundary-geometry";
import { buildBoundaryLayers, boundaryLayerSpecs, ringCentre } from "./boundary-layers";
import { parseZoneBoundary, zoneMapSchema, type ZoneBoundary } from "./zone-map-contract";

const square = (lon: number, lat: number, size = 0.01, name?: string) => ({ type: "Feature" as const, properties: name ? { name } : {},
  geometry: { type: "Polygon" as const, coordinates: [[[lon, lat], [lon + size, lat], [lon + size, lat + size], [lon, lat + size], [lon, lat]]] } });
const boundary = (...features: ReturnType<typeof square>[]) => ({ type: "FeatureCollection" as const, features });
const one = boundary(square(107.45, 21)) as unknown as ZoneBoundary;

describe("point in polygon", () => {
  const ring = one.features[0].geometry.coordinates[0];
  it("finds points inside and outside, closed or open ring", () => {
    expect(pointInRing({ latitude: 21.005, longitude: 107.455 }, ring)).toBe(true);
    expect(pointInRing({ latitude: 21.005, longitude: 107.465 }, ring)).toBe(false);
    expect(pointInRing({ latitude: 21.005, longitude: 107.455 }, ring.slice(0, -1))).toBe(true);
  });
  it("handles a concave polygon", () => {
    const l: [number, number][] = [[0, 0], [4, 0], [4, 1], [1, 1], [1, 4], [0, 4]];
    expect(pointInRing({ latitude: 3, longitude: 0.5 }, l)).toBe(true);
    expect(pointInRing({ latitude: 3, longitude: 2 }, l)).toBe(false);
  });
});

describe("placement against a boundary", () => {
  it("says nothing without a boundary", () => {
    expect(placementOf({ latitude: 21, longitude: 107 }, null)).toBeUndefined();
    expect(isOutsideBoundary({ latitude: 21, longitude: 107 }, null)).toBe(false);
    expect(boundaryRings(null)).toEqual([]);
  });
  it("is inside in any of several areas", () => {
    const two = boundary(square(107.45, 21), square(107.5, 21)) as unknown as ZoneBoundary;
    expect(placementOf({ latitude: 21.005, longitude: 107.505 }, two)).toEqual({ inside: true });
  });
  it("measures whole metres to the nearest edge and formats them", () => {
    // 0.001 deg of longitude at 21 deg north is about 104 m.
    const placement = placementOf({ latitude: 21.005, longitude: 107.461 }, one);
    expect(placement?.inside).toBe(false);
    const distance = placement && !placement.inside ? placement.distanceM : 0;
    expect(distance).toBeGreaterThan(100); expect(distance).toBeLessThan(108);
    expect(placementText({ inside: false, distanceM: 1200 })).toBe("Ngoài ranh giới 1.200 m");
    expect(placementText({ inside: true })).toBe("Trong ranh giới");
  });
  it("treats a pin within 1 m of the edge as inside, like the backend", () => {
    expect(placementOf({ latitude: 21.005, longitude: 107.460004 }, one)).toEqual({ inside: true });
    expect(isOutsideBoundary({ latitude: 21.005, longitude: 107.4601 }, one)).toBe(true);
  });
});

describe("tolerant boundary read", () => {
  it("keeps a valid boundary and trims names", () => {
    const parsed = parseZoneBoundary(boundary(square(107.45, 21, 0.01, "  Khu 1 "), square(107.5, 21)));
    expect(parsed?.features).toHaveLength(2);
    expect(parsed?.features[0].properties).toEqual({ name: "Khu 1" });
    expect(parsed?.features[1].properties).toEqual({});
  });
  it.each([
    ["null", null], ["a string", "x"], ["wrong type", { type: "Feature" }], ["no features", { type: "FeatureCollection", features: [] }],
    ["11 areas", boundary(...Array.from({ length: 11 }, (_, i) => square(107 + i * 0.1, 21)))],
    ["a point", { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [107, 21] } }] }],
    ["two corners", { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[107, 21], [108, 21], [107, 21]]] } }] }],
    ["swapped out-of-range position", { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[21, 107], [21, 108], [22, 107]]] } }] }],
    ["one bad feature among good ones", { type: "FeatureCollection", features: [square(107.45, 21), { type: "Feature", properties: {}, geometry: null }] }],
  ])("reads %s as no boundary", (_label, value) => expect(parseZoneBoundary(value)).toBeNull());
  it("makes a malformed or missing boundary null inside the zone map answer without failing the zone", () => {
    const zone = { id: "11111111-1111-4111-8111-111111111111", code: "Z1", name: "Vùng 1", latitude: 21, longitude: 107, statusId: 101, status: "In Use", rafts: [] };
    const parsed = zoneMapSchema.parse([{ ...zone, boundary: { type: "nope" } }, zone, { ...zone, boundary: boundary(square(107.45, 21)) }]);
    expect(parsed.map(row => row.boundary === null)).toEqual([true, true, false]);
  });
});

describe("boundary layers", () => {
  it("draws nothing when no zone has a boundary", () => {
    expect(buildBoundaryLayers([{ code: "Z1", boundary: null }])).toBeUndefined();
    expect(buildBoundaryLayers([])).toBeUndefined();
  });
  it("builds a polygon and a name label per khu, with a fallback name only when the zone has several", () => {
    const layers = buildBoundaryLayers([{ code: "Z1", boundary: parseZoneBoundary(boundary(square(107.45, 21, 0.01, "Khu A"), square(107.5, 21)))! }]);
    expect(layers?.data.features).toHaveLength(2);
    expect(layers?.labels.map(label => label.text)).toEqual(["Khu A", "Vùng 2"]);
    expect(layers?.positions).toHaveLength(10);
    expect(layers?.labels[0].position[0]).toBeCloseTo(107.455, 5);
    expect(layers?.labels[0].position[1]).toBeCloseTo(21.005, 5);
  });
  it("leads the label with the zone code on a map of several zones, and labels a single unnamed khu by zone code only there", () => {
    const layers = buildBoundaryLayers([{ code: "Z1", boundary: parseZoneBoundary(boundary(square(107.45, 21)))! }, { code: "Z2", boundary: parseZoneBoundary(boundary(square(107.6, 21, 0.01, "Khu B")))! }, { code: "Z3", boundary: null }]);
    expect(layers?.labels.map(label => label.text)).toEqual(["Z1", "Z2 · Khu B"]);
  });
  it("has a fill below an outline on the same source", () => {
    const [fill, line] = boundaryLayerSpecs();
    expect([fill.type, line.type]).toEqual(["fill", "line"]);
    expect(fill.source).toBe(line.source);
  });
  it("finds the centre of a ring, also of a degenerate one", () => {
    expect(ringCentre([[0, 0], [2, 0], [2, 2], [0, 2]])).toEqual([1, 1]);
    expect(ringCentre([[0, 0], [2, 2], [4, 4]])).toEqual([2, 2]);
  });
});
