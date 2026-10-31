import { expect, it } from "vitest";
import { missingZoneDocuments, zoneDocumentState } from "./zone-document-state";
import type { ZoneDocument } from "./farming-zone";

const document: ZoneDocument = {
  id: "doc-1",
  type: "AQUACULTURE_LICENSE",
  number: "GP-01",
  effectiveDate: "2026-01-01",
  expiryDate: "2026-10-31",
  issuingAuthority: "",
  holder: "",
  legalScope: "",
  zoneIds: ["zone-east"],
  replacesId: null,
  fileName: "gp.pdf",
  recordVersion: "v1",
};
it.each([
  ["2025-12-31", "not-effective"],
  ["2026-09-30", "valid"],
  ["2026-10-01", "expiring"],
  ["2026-10-31", "expiring"],
  ["2026-11-01", "expired"],
])("derives status on %s without a background job", (date, expected) =>
  expect(zoneDocumentState(document, [document], date)).toBe(expected),
);
it("treats absent expiry as valid while still checking the effective date", () => {
  expect(
    zoneDocumentState({ ...document, expiryDate: "" }, [], "2026-10-28"),
  ).toBe("valid");
});
it("requires both mandatory types on the actual zone and date", () => {
  expect(missingZoneDocuments("zone-east", [], "2026-10-28")).toHaveLength(2);
  const allocation = {
    ...document,
    id: "doc-2",
    type: "SEA_AREA_ALLOCATION" as const,
  };
  expect(
    missingZoneDocuments("zone-east", [document, allocation], "2026-10-28"),
  ).toEqual([]);
  expect(
    missingZoneDocuments("zone-west", [document, allocation], "2026-10-28"),
  ).toHaveLength(2);
  expect(
    missingZoneDocuments("zone-east", [document, allocation], "2026-11-01"),
  ).toHaveLength(2);
});
