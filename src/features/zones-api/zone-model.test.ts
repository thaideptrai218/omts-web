import { describe, expect, it } from "vitest";
import { applyMapPrefill, emptyZoneDraft, filterZones, noMapFilled, sortZones, validateZoneDraft, zoneBody, zoneFields, type ZoneRow } from "./zone-model";

const row = (code: string, name: string, patch: Partial<ZoneRow> = {}): ZoneRow => ({ id: `00000000-0000-4000-8000-${code.replace(/\D/g, "").padStart(12, "0")}`, code, name, location: null, area: null,
  statusId: 101, status: "In Use", inUseRaftCount: 0, licenseState: null, ...patch });
const rows = [row("V10", "Ngọc Vừng", { area: 5, inUseRaftCount: 2, licenseState: "Valid" }), row("V02", "Quan Lạn", { statusId: 102, status: "Discontinued", area: 12 }), row("V01", "Minh Châu", { location: "Đảo Minh Châu", licenseState: "Expired" })];

describe("zone list", () => {
  it("searches code, name and location without diacritics", () => {
    expect(filterZones(rows, { search: "ngoc vung", statusId: "", license: "" }).map(zone => zone.code)).toEqual(["V10"]);
    expect(filterZones(rows, { search: "dao minh", statusId: "", license: "" }).map(zone => zone.code)).toEqual(["V01"]);
  });
  it("filters by status; no badge on the list is NOT Missing, the flag computed from the licence overview is", () => {
    expect(filterZones(rows, { search: "", statusId: "102", license: "" }).map(zone => zone.code)).toEqual(["V02"]);
    expect(filterZones(rows, { search: "", statusId: "", license: "Missing" })).toEqual([]);
    const flags = new Map([[rows[1].id, "Missing"], [rows[2].id, "Expired"]]);
    expect(filterZones(rows, { search: "", statusId: "", license: "Missing" }, flags).map(zone => zone.code)).toEqual(["V02"]);
    expect(filterZones(rows, { search: "", statusId: "", license: "Valid" }, flags).map(zone => zone.code)).toEqual(["V10"]);
    expect(filterZones(rows, { search: "", statusId: "", license: "Expired" }, flags).map(zone => zone.code)).toEqual(["V01"]);
  });
  it("sorts zones with an unknown licence flag last", () => {
    expect(sortZones(rows, "license", "asc", undefined, new Map()).map(zone => zone.code)).toEqual(["V01", "V10", "V02"]);
  });
  it("sorts the whole set by number or natural text in both directions", () => {
    expect(sortZones(rows, "code", "asc").map(zone => zone.code)).toEqual(["V01", "V02", "V10"]);
    expect(sortZones(rows, "area", "desc").map(zone => zone.code)).toEqual(["V02", "V10", "V01"]);
  });
});

describe("zone draft", () => {
  const valid = { code: "V01", name: "Vùng A", location: "Cô Tô", area: "12,5" };
  it("requires only the code and the name", () => {
    expect(Object.keys(validateZoneDraft(emptyZoneDraft)).sort()).toEqual(["code", "name"]);
    expect(validateZoneDraft({ ...emptyZoneDraft, code: "KV01", name: "Vùng A" })).toEqual({});
    expect(validateZoneDraft(valid)).toEqual({});
  });
  it("checks a location and an area only when they are typed", () => {
    expect(validateZoneDraft({ ...valid, area: "0" }).area).toBeTruthy();
    expect(validateZoneDraft({ ...valid, area: "-3" }).area).toBeTruthy();
    expect(validateZoneDraft({ ...valid, area: "abc" }).area).toBeTruthy();
    expect(validateZoneDraft({ ...valid, area: "1000001" }).area).toBeTruthy();
    expect(validateZoneDraft({ ...valid, area: "0,5" }).area).toBeUndefined();
    expect(validateZoneDraft({ ...valid, location: "x".repeat(501) }).location).toBeTruthy();
    expect(validateZoneDraft({ ...valid, location: "x".repeat(500) }).location).toBeUndefined();
  });
  it("has no coordinates: a zone draft is code, name, location and area", () => {
    expect(Object.keys(emptyZoneDraft)).toEqual(["code", "name", "location", "area"]);
    expect(zoneFields.map(([key]) => key)).toEqual(["code", "name", "location", "area"]);
  });
  it("builds the write body with numbers, null for an empty area, and the row version for updates only", () => {
    expect(zoneBody(valid)).toEqual({ code: "V01", name: "Vùng A", location: "Cô Tô", area: 12.5 });
    expect(zoneBody(valid, "v7")).toMatchObject({ rowVersion: "v7" });
    expect(zoneBody({ ...emptyZoneDraft, code: " KV01 ", name: " Vùng " })).toEqual({ code: "KV01", name: "Vùng", location: "", area: null });
    expect(zoneBody(valid)).not.toHaveProperty("latitude");
    expect(zoneBody(valid)).not.toHaveProperty("longitude");
  });
  it("sorts by the newest water measurement, zones without one last when descending", () => {
    const latest = new Map<string, string | null>([[rows[0].id, "2026-11-09T06:40:00+07:00"], [rows[1].id, null], [rows[2].id, "2026-11-10T06:40:00+07:00"]]);
    expect(sortZones(rows, "water", "desc", latest).map(zone => zone.code)).toEqual(["V01", "V10", "V02"]);
  });
});

describe("map prefill", () => {
  const prefill = { areaHa: 28.5, location: "Xã Đông Xá, huyện Vân Đồn" };
  it("fills empty location and area and marks them as coming from the map", () => {
    const result = applyMapPrefill({ ...emptyZoneDraft, code: "KV01", name: "Vùng A" }, noMapFilled, prefill);
    expect(result.draft).toEqual({ code: "KV01", name: "Vùng A", location: "Xã Đông Xá, huyện Vân Đồn", area: "28.5" });
    expect(result.filled).toEqual({ location: true, area: true });
  });
  it("never overwrites a value the user typed, and never touches the name", () => {
    const typed = { ...emptyZoneDraft, name: "Tên tự đặt", location: "Gõ tay", area: "7" };
    const result = applyMapPrefill(typed, noMapFilled, prefill);
    expect(result.draft).toEqual(typed);
    expect(result.filled).toEqual(noMapFilled);
  });
  it("replaces a value that still comes from a previous read, and fills only the field that is empty", () => {
    const first = applyMapPrefill(emptyZoneDraft, noMapFilled, prefill);
    const second = applyMapPrefill(first.draft, first.filled, { areaHa: 30, location: "Nơi khác" });
    expect(second.draft).toMatchObject({ location: "Nơi khác", area: "30" });
    const mixed = applyMapPrefill({ ...emptyZoneDraft, area: "7" }, noMapFilled, prefill);
    expect(mixed.draft).toMatchObject({ location: "Xã Đông Xá, huyện Vân Đồn", area: "7" });
    expect(mixed.filled).toEqual({ location: true, area: false });
  });
  it("changes nothing for what the photo did not show", () => {
    const first = applyMapPrefill(emptyZoneDraft, noMapFilled, prefill);
    expect(applyMapPrefill(first.draft, first.filled, { areaHa: null, location: null })).toEqual(first);
    expect(applyMapPrefill(emptyZoneDraft, noMapFilled, { areaHa: null, location: "  " }).draft.location).toBe("");
  });
});
