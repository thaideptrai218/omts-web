import { expect, it } from "vitest";
import { farmingZoneSchema, zoneDocumentSchema } from "./farming-zone-schema";

const zone = {
  code: "VN-01",
  name: "Vùng nuôi",
  location: "Vị trí vùng",
  latitude: "21,1",
  longitude: "107.4",
  area: "12,5",
  waterMeasurementPoint: "Điểm giữa vùng",
};
it("accepts comma decimals used by Vietnamese forms", () =>
  expect(farmingZoneSchema.safeParse(zone).success).toBe(true));
it.each([
  ["latitude", "91"],
  ["longitude", "-181"],
  ["area", "0"],
  ["area", "-1"],
  ["area", "100000000000000"],
  ["code", ""],
  ["name", " "],
])("rejects %s=%s", (key, value) => {
  expect(farmingZoneSchema.safeParse({ ...zone, [key]: value }).success).toBe(
    false,
  );
});
it("requires actual dates and at least one distinct coverage zone", () => {
  const document = {
    type: "OTHER",
    number: "01",
    effectiveDate: "2026-10-28",
    expiryDate: "",
    issuingAuthority: "",
    holder: "",
    legalScope: "",
    zoneIds: ["east"],
  };
  expect(zoneDocumentSchema.safeParse(document).success).toBe(true);
  for (const patch of [
    { effectiveDate: "2026-02-30" },
    { expiryDate: "2026-10-28" },
    { zoneIds: [] },
    { zoneIds: ["east", "east"] },
  ])
    expect(
      zoneDocumentSchema.safeParse({ ...document, ...patch }).success,
    ).toBe(false);
});
