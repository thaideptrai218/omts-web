import { describe, expect, it } from "vitest";
import { coordinateWarningTexts, projectCoordinateWarnings } from "./coordinate-warnings";

describe("boundary warnings", () => {
  it("words a raft outside the zone boundary in whole metres", () => {
    expect(coordinateWarningTexts({ warnings: [{ code: "RAFT_OUTSIDE_ZONE_BOUNDARY", details: { distanceM: 42 } }] }))
      .toEqual(["Bè nằm ngoài ranh giới vùng 42 m. Hãy kiểm tra lại vị trí bè."]);
    expect(coordinateWarningTexts({ warnings: [{ code: "RAFT_OUTSIDE_ZONE_BOUNDARY", details: { distanceM: 1250 } }] })[0]).toContain("1.250 m");
    expect(coordinateWarningTexts({ warnings: [{ code: "RAFT_OUTSIDE_ZONE_BOUNDARY" }] })).toEqual(["Bè nằm ngoài ranh giới vùng. Hãy kiểm tra lại vị trí bè."]);
  });
  it("counts and names the rafts left outside a new boundary, with an ellipsis when the list is cut", () => {
    expect(coordinateWarningTexts({ warnings: [{ code: "RAFTS_OUTSIDE_ZONE_BOUNDARY", details: { count: 2, raftCodes: ["B01", "B05"] } }] }))
      .toEqual(["2 bè đang nằm ngoài ranh giới mới: B01, B05."]);
    const many = Array.from({ length: 12 }, (_, index) => `B${String(index + 1).padStart(2, "0")}`);
    expect(coordinateWarningTexts({ warnings: [{ code: "RAFTS_OUTSIDE_ZONE_BOUNDARY", details: { count: 12, raftCodes: many } }] }))
      .toEqual(["12 bè đang nằm ngoài ranh giới mới: B01, B02, B03, B04, B05, B06, B07, B08, B09, B10…"]);
    expect(coordinateWarningTexts({ warnings: [{ code: "RAFTS_OUTSIDE_ZONE_BOUNDARY", details: { count: 3 } }] })).toEqual(["3 bè đang nằm ngoài ranh giới mới."]);
  });
  it("keeps the earlier warnings and drops unknown codes and malformed details", () => {
    const projected = projectCoordinateWarnings({ warnings: [
      { code: "RAFT_FAR_FROM_ZONE", details: { distanceKm: 6.7, limitKm: 5 } }, { code: "SOMETHING_ELSE" }, { code: "RAFTS_OUTSIDE_ZONE_BOUNDARY", details: { count: "many", raftCodes: [1] } }, "x",
    ] });
    expect(projected.map(warning => warning.code)).toEqual(["RAFT_FAR_FROM_ZONE", "RAFTS_OUTSIDE_ZONE_BOUNDARY"]);
    expect(projected[1].details).toBeUndefined();
    expect(coordinateWarningTexts({ warnings: [{ code: "RAFT_FAR_FROM_ZONE", details: { distanceKm: 6.7, limitKm: 5 } }] })[0]).toContain("6,7 km");
    expect(coordinateWarningTexts({})).toEqual([]);
  });
});
