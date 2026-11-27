import { describe, expect, it } from "vitest";
import { areaDraft, areaMatches, areaPositions, boundaryAreaHa, boundaryOf, checkCorner, cornerDraft, draftsOf, emptyCorner, gridAreaHa, parseGridNumber, placementOf, reviewBoundary, ringAreaHa, selfIntersects, type AreaDraft } from "./boundary-geometry";
import { DEFAULT_CENTRAL_MERIDIAN as MERIDIAN } from "./vn2000";

const X0 = 2315876.23, Y0 = 437512.47;
/** A 100 m square at the Vân Đồn sample K1: one hectare on the grid. */
const square = (name = "Khu 1", written: number | null = 1): AreaDraft => areaDraft(name, [
  cornerDraft("K1", X0, Y0), cornerDraft("K2", X0 + 100, Y0), cornerDraft("K3", X0 + 100, Y0 + 100), cornerDraft("K4", X0, Y0 + 100),
], written);
const bowTie = () => areaDraft("Khu 3", [cornerDraft("1", X0, Y0), cornerDraft("2", X0 + 100, Y0 + 100), cornerDraft("3", X0 + 100, Y0), cornerDraft("4", X0, Y0 + 100)]);

describe("grid numbers", () => {
  it("reads dot and comma decimals and thousand separators", () => {
    expect(parseGridNumber("2315876.23")).toBe(2315876.23);
    expect(parseGridNumber(" 2315876,23 ")).toBe(2315876.23);
    expect(parseGridNumber("2.315.876,23")).toBe(2315876.23);
    expect(parseGridNumber("")).toBeNull();
    expect(parseGridNumber("12a")).toBeNull();
    expect(parseGridNumber("-5")).toBeNull();
  });
});

describe("corner check", () => {
  it("converts X, Y to the WGS84 position the mobile app computes for K1", () => {
    const check = checkCorner(cornerDraft("K1", X0, Y0), MERIDIAN);
    expect(check.state).toBe("ok");
    expect(check.position?.latitude).toBeCloseTo(20.934996973595144, 6);
    expect(check.position?.longitude).toBeCloseTo(107.15106903922836, 6);
  });
  it("flags empty cells and points that fall outside Vietnam", () => {
    expect(checkCorner(emptyCorner("K9"), MERIDIAN).state).toBe("missing");
    expect(checkCorner(cornerDraft("K9", X0, null), MERIDIAN).state).toBe("missing");
    expect(checkCorner({ key: "z", label: "K9", x: "5000000", y: "437512" }, MERIDIAN).state).toBe("outside");
  });
});

describe("boundary GeoJSON", () => {
  it("builds one closed ring per khu with the corner labels, positions as [longitude, latitude] rounded to 6 decimals", () => {
    const boundary = boundaryOf([square()], MERIDIAN);
    expect(boundary?.features).toHaveLength(1);
    const ring = boundary!.features[0].geometry.coordinates[0];
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[4]);
    expect(ring[0][0]).toBeCloseTo(107.151069, 6);
    expect(ring[0][1]).toBeCloseTo(20.934997, 6);
    expect(boundary!.features[0].properties).toEqual({ name: "Khu 1", corners: ["K1", "K2", "K3", "K4"] });
  });
  it("skips khu with under 3 usable corners and gives null when none can be drawn", () => {
    const thin = areaDraft("Khu 2", [cornerDraft("A", X0, Y0), cornerDraft("B", X0 + 5, Y0 + 5), emptyCorner("C")]);
    expect(boundaryOf([square(), thin], MERIDIAN)?.features).toHaveLength(1);
    expect(boundaryOf([thin], MERIDIAN)).toBeNull();
    expect(boundaryOf([], MERIDIAN)).toBeNull();
  });
  it("shows a saved boundary again as X, Y within the 6-decimal rounding, closing point dropped", () => {
    const drafts = draftsOf(boundaryOf([square()], MERIDIAN), MERIDIAN);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].name).toBe("Khu 1");
    expect(drafts[0].corners.map(corner => corner.label)).toEqual(["K1", "K2", "K3", "K4"]);
    // A saved boundary keeps 6 decimals of a degree (about 0.1 m), so X, Y come back within that.
    expect(Math.abs(Number(drafts[0].corners[0].x) - X0)).toBeLessThan(0.2);
    expect(Math.abs(Number(drafts[0].corners[2].y) - (Y0 + 100))).toBeLessThan(0.2);
  });
  it("names khu and corners that a boundary saved elsewhere left unnamed", () => {
    const boundary = boundaryOf([square()], MERIDIAN)!;
    boundary.features[0].properties = null;
    const [draft] = draftsOf(boundary, MERIDIAN);
    expect(draft.name).toBe("Vùng 1");
    expect(draft.corners.every(corner => corner.label === "")).toBe(true);
  });
});

describe("areas", () => {
  it("measures a 100 m square as one hectare, on the grid and on the WGS84 ring", () => {
    expect(gridAreaHa(square())).toBeCloseTo(1, 6);
    const positions = areaPositions(square(), MERIDIAN).map(item => item.position);
    expect(ringAreaHa(positions)).toBeGreaterThan(0.99);
    expect(ringAreaHa(positions)).toBeLessThan(1.01);
    expect(boundaryAreaHa(boundaryOf([square()], MERIDIAN)!)).toBeCloseTo(ringAreaHa(positions), 3);
  });
  it("applies the server's tolerance: 2 % of the written area, at least 0.05 ha", () => {
    expect(areaMatches(12.5, 12.6)).toBe(true);
    expect(areaMatches(12.5, 13)).toBe(false);
    expect(areaMatches(1, 1.04)).toBe(true);
    expect(areaMatches(1, 1.06)).toBe(false);
    expect(areaMatches(null, 1)).toBeNull();
    expect(areaMatches(1, null)).toBeNull();
  });
  it("detects a bow-tie outline", () => {
    expect(selfIntersects(areaPositions(bowTie(), MERIDIAN).map(item => item.position))).toBe(true);
    expect(selfIntersects(areaPositions(square(), MERIDIAN).map(item => item.position))).toBe(false);
  });
});

describe("placement", () => {
  const boundary = boundaryOf([square()], MERIDIAN)!;
  const inside = checkCorner(cornerDraft("p", X0 + 50, Y0 + 50), MERIDIAN).position!;
  const near = checkCorner(cornerDraft("p", X0 + 50, Y0 + 140), MERIDIAN).position!;
  it("tells inside from outside and gives the distance to the nearest edge", () => {
    expect(placementOf(boundary, inside)).toEqual({ inside: true, distanceM: 0 });
    const outside = placementOf(boundary, near);
    expect(outside?.inside).toBe(false);
    expect(outside?.distanceM).toBeGreaterThan(35);
    expect(outside?.distanceM).toBeLessThan(45);
  });
  it("has no answer without a boundary", () => {
    expect(placementOf(null, inside)).toBeNull();
    expect(placementOf(undefined, inside)).toBeNull();
  });
});

describe("review", () => {
  it("has nothing to say about no khu or a clean khu", () => {
    expect(reviewBoundary([], MERIDIAN)).toEqual({ blocking: [], warnings: [] });
    expect(reviewBoundary([square()], MERIDIAN)).toEqual({ blocking: [], warnings: [] });
  });
  it("blocks a khu under 3 corners and a corner without numbers", () => {
    const small = areaDraft("Khu 2", [cornerDraft("A", X0, Y0), cornerDraft("B", X0 + 5, Y0 + 5)]);
    expect(reviewBoundary([small], MERIDIAN).blocking.map(issue => issue.message)).toEqual(["Khu 2 cần ít nhất 3 điểm góc."]);
    const gap = square();
    gap.corners[1] = emptyCorner("K2");
    const review = reviewBoundary([gap], MERIDIAN);
    expect(review.blocking[0]).toMatchObject({ areaKey: gap.key, cornerKey: gap.corners[1].key });
    expect(review.blocking[0].message).toContain("điểm K2 chưa có X, Y hợp lệ");
  });
  it("blocks over 100 corners, over 10 khu, duplicate corners and values outside Vietnam", () => {
    const many = areaDraft("Dài", Array.from({ length: 101 }, (_, index) => cornerDraft(`P${index}`, X0 + index, Y0 + (index % 7))));
    expect(reviewBoundary([many], MERIDIAN).blocking.some(issue => issue.message.includes("quá 100 điểm góc"))).toBe(true);
    expect(reviewBoundary(Array.from({ length: 11 }, (_, index) => square(`Khu ${index + 1}`)), MERIDIAN).blocking[0].message).toContain("tối đa 10 vùng");
    const twin = square();
    twin.corners[3] = cornerDraft("K4", X0, Y0);
    expect(reviewBoundary([twin], MERIDIAN).blocking.some(issue => issue.message.includes("trùng vị trí với điểm K1"))).toBe(true);
    const far = square();
    far.corners[0] = { key: "f", label: "K1", x: "9999999", y: "437512" };
    expect(reviewBoundary([far], MERIDIAN).blocking[0].message).toContain("ngoài lãnh thổ Việt Nam");
  });
  it("blocks names over the backend limits", () => {
    const long = square("a".repeat(101));
    long.corners[0].label = "L".repeat(21);
    const messages = reviewBoundary([long], MERIDIAN).blocking.map(issue => issue.message);
    expect(messages.some(message => message.includes("tên vùng tối đa 100"))).toBe(true);
    expect(messages.some(message => message.includes("tên điểm") && message.includes("tối đa 20"))).toBe(true);
  });
  it("only warns about a written area that disagrees with the corners and about a crossing outline", () => {
    const review = reviewBoundary([square("Khu 1", 2.5)], MERIDIAN);
    expect(review.blocking).toEqual([]);
    expect(review.warnings).toHaveLength(1);
    expect(review.warnings[0].message).toContain("lệch diện tích ghi trên sơ đồ");
    expect(reviewBoundary([bowTie()], MERIDIAN).warnings[0].message).toContain("tự cắt nhau");
  });
});
