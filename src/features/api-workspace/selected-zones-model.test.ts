// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readStoredZoneSelection, resolveZoneSelection, toggleZoneSelection, writeStoredZoneSelection, zoneSelectionLabel, type ZoneOption,
} from "./selected-zones-model";

const zones: ZoneOption[] = ["Ngọc Vừng", "Minh Châu", "Quan Lạn", "Cô Tô"].map((name, index) => ({ id: `z${index + 1}`, name }));
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe("zone selection label", () => {
  it("names all, one, two and many zones", () => {
    expect(zoneSelectionLabel(zones, resolveZoneSelection(zones, undefined))).toBe("Tất cả khu nuôi");
    expect(zoneSelectionLabel(zones, resolveZoneSelection(zones, { kind: "ids", ids: ["z2"] }))).toBe("Minh Châu");
    expect(zoneSelectionLabel(zones, resolveZoneSelection(zones, { kind: "ids", ids: ["z2", "z1"] }))).toBe("Ngọc Vừng và Minh Châu");
    expect(zoneSelectionLabel(zones, resolveZoneSelection(zones, { kind: "ids", ids: ["z1", "z2", "z3"] }))).toBe("Ngọc Vừng và 2 khu khác");
  });
});

describe("zone selection resolution", () => {
  it("drops zones that are no longer visible and falls back to all when none remain", () => {
    expect(resolveZoneSelection(zones, { kind: "ids", ids: ["z2", "gone"] })).toEqual({ selectedIds: ["z2"], allSelected: false });
    expect(resolveZoneSelection(zones, { kind: "ids", ids: ["gone"] })).toEqual({ selectedIds: ["z1", "z2", "z3", "z4"], allSelected: true });
  });
  it("treats a saved list covering every zone as all", () => {
    expect(resolveZoneSelection(zones, { kind: "ids", ids: ["z4", "z3", "z2", "z1"] }).allSelected).toBe(true);
  });
});

describe("toggling zones", () => {
  it("unchecks one zone out of all and returns to all when everything is re-checked", () => {
    const all = resolveZoneSelection(zones, undefined);
    const withoutOne = toggleZoneSelection(zones, all, "z1");
    expect(withoutOne).toEqual({ kind: "ids", ids: ["z2", "z3", "z4"] });
    expect(toggleZoneSelection(zones, resolveZoneSelection(zones, withoutOne), "z1")).toEqual({ kind: "all" });
  });
  it("never lets the last zone be removed", () => {
    const one = resolveZoneSelection(zones, { kind: "ids", ids: ["z3"] });
    expect(toggleZoneSelection(zones, one, "z3")).toEqual({ kind: "ids", ids: ["z3"] });
  });
});

describe("persistence", () => {
  it("round-trips per account and ignores corrupt values", () => {
    writeStoredZoneSelection("a1", { kind: "ids", ids: ["z2"] });
    expect(readStoredZoneSelection("a1")).toEqual({ kind: "ids", ids: ["z2"] });
    expect(readStoredZoneSelection("a2")).toBeUndefined();
    localStorage.setItem("omts.selected-zones.v1.a3", "{not json");
    expect(readStoredZoneSelection("a3")).toBeUndefined();
    localStorage.setItem("omts.selected-zones.v1.a4", JSON.stringify({ kind: "ids", ids: [1] }));
    expect(readStoredZoneSelection("a4")).toBeUndefined();
  });
  it("survives storage that throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readStoredZoneSelection("a1")).toBeUndefined();
    expect(() => writeStoredZoneSelection("a1", { kind: "all" })).not.toThrow();
  });
});
