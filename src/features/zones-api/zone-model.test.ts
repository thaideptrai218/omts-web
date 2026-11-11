import { describe, expect, it } from "vitest";
import { emptyZoneDraft, filterZones, sortZones, validateZoneDraft, zoneBody, type ZoneRow } from "./zone-model";

const row = (code: string, name: string, patch: Partial<ZoneRow> = {}): ZoneRow => ({ id: `00000000-0000-4000-8000-${code.replace(/\D/g, "").padStart(12, "0")}`, code, name, location: null, area: null,
  statusId: 101, status: "In Use", inUseRaftCount: 0, licenseState: null, ...patch });
const rows = [row("V10", "Ngọc Vừng", { area: 5, inUseRaftCount: 2, licenseState: "Valid" }), row("V02", "Quan Lạn", { statusId: 102, status: "Discontinued", area: 12 }), row("V01", "Minh Châu", { location: "Đảo Minh Châu", licenseState: "Expired" })];

describe("zone list", () => {
  it("searches code, name and location without diacritics", () => {
    expect(filterZones(rows, { search: "ngoc vung", statusId: "", license: "" }).map(zone => zone.code)).toEqual(["V10"]);
    expect(filterZones(rows, { search: "dao minh", statusId: "", license: "" }).map(zone => zone.code)).toEqual(["V01"]);
  });
  it("filters by status and treats a missing license state as Missing", () => {
    expect(filterZones(rows, { search: "", statusId: "102", license: "" }).map(zone => zone.code)).toEqual(["V02"]);
    expect(filterZones(rows, { search: "", statusId: "", license: "Missing" }).map(zone => zone.code)).toEqual(["V02"]);
  });
  it("sorts the whole set by number or natural text in both directions", () => {
    expect(sortZones(rows, "code", "asc").map(zone => zone.code)).toEqual(["V01", "V02", "V10"]);
    expect(sortZones(rows, "area", "desc").map(zone => zone.code)).toEqual(["V02", "V10", "V01"]);
  });
});

describe("zone draft", () => {
  const valid = { code: "V01", name: "Vùng A", location: "Cô Tô", latitude: "20,9", longitude: "107.4", area: "12,5" };
  it("requires every field", () => {
    expect(Object.keys(validateZoneDraft(emptyZoneDraft)).sort()).toEqual(["area", "code", "latitude", "location", "longitude", "name"]);
    expect(validateZoneDraft(valid)).toEqual({});
  });
  it("keeps coordinates inside their ranges", () => {
    expect(validateZoneDraft({ ...valid, latitude: "91" }).latitude).toBeTruthy();
    expect(validateZoneDraft({ ...valid, longitude: "abc" }).longitude).toBeTruthy();
  });
  it("builds the write body with numbers and the row version for updates only", () => {
    expect(zoneBody(valid)).toEqual({ code: "V01", name: "Vùng A", location: "Cô Tô", latitude: 20.9, longitude: 107.4, area: 12.5 });
    expect(zoneBody(valid, "v7")).toMatchObject({ rowVersion: "v7" });
  });
  it("sorts by the newest water measurement, zones without one last when descending", () => {
    const latest = new Map<string, string | null>([[rows[0].id, "2026-11-09T06:40:00+07:00"], [rows[1].id, null], [rows[2].id, "2026-11-10T06:40:00+07:00"]]);
    expect(sortZones(rows, "water", "desc", latest).map(zone => zone.code)).toEqual(["V01", "V10", "V02"]);
  });
});
