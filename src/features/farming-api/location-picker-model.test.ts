import { describe, expect, it } from "vitest";
import { describePoint, draftOfPoint, nudgeOfKey, nudgePoint, pinsOf, pointOfDraft } from "./location-picker-model";

describe("location picker model", () => {
  it("reads a point only from two valid numbers", () => {
    expect(pointOfDraft("21,0712", "107.4321")).toEqual({ latitude: 21.0712, longitude: 107.4321 });
    expect(pointOfDraft("", "107")).toBeUndefined();
    expect(pointOfDraft("91", "107")).toBeUndefined();
    expect(pointOfDraft("abc", "107")).toBeUndefined();
  });
  it("writes at most six decimals and captions the point", () => {
    expect(draftOfPoint({ latitude: 21.07123456789, longitude: 107.4 })).toEqual({ latitude: "21.071235", longitude: "107.4" });
    expect(describePoint({ latitude: 21.0712, longitude: 107.4321 })).toBe("Vĩ độ 21.0712 · Kinh độ 107.4321");
  });
  it("nudges by arrow key and stays inside the valid range", () => {
    expect(nudgeOfKey("ArrowUp", false)).toEqual([1, 0]);
    expect(nudgeOfKey("ArrowLeft", true)).toEqual([0, -10]);
    expect(nudgeOfKey("a", false)).toBeUndefined();
    expect(nudgePoint({ latitude: 21, longitude: 107 }, 1, -1)).toEqual({ latitude: 21.0001, longitude: 106.9999 });
    expect(nudgePoint({ latitude: 90, longitude: 180 }, 5, 5)).toEqual({ latitude: 90, longitude: 180 });
  });
  it("keeps only rows with coordinates and can skip the record being edited", () => {
    const rows = [{ id: "a", code: "B1", latitude: 1, longitude: 2 }, { id: "b", code: "B2", latitude: null, longitude: null }, { id: "c", code: "B3", latitude: 3, longitude: 4 }];
    expect(pinsOf("raft", rows, "c").map(pin => pin.label)).toEqual(["Bè B1"]);
    expect(pinsOf("zone", [{ id: "bad", code: "Z", latitude: NaN, longitude: 107 }, { id: "out", code: "Z2", latitude: 91, longitude: 107 }])).toEqual([]);
  });
});
