import { describe, expect, it } from "vitest";
import { licenseFlagOf } from "./zone-license-flags";
import { licenseReminders, newestLicensePerType } from "./zone-license-display";

const row = (documentType: string, patch: object = {}) => ({ documentType, documentTypeName: documentType, state: "Valid", documentId: `${documentType}-${Math.random()}`, documentNumber: "GP-1", effectiveDate: "2026-01-01", expiryDate: "2027-01-01", isReplaced: false, ...patch });

describe("licence display: newest document of each type", () => {
  it("hides the replaced document when its replacement exists, whatever the order", () => {
    const old = row("AQUACULTURE_LICENSE", { documentId: "old", isReplaced: true, state: "Replaced", effectiveDate: "2025-01-01" }), current = row("AQUACULTURE_LICENSE", { documentId: "new", effectiveDate: "2026-01-01" });
    expect(newestLicensePerType([old, current]).map(entry => entry.documentId)).toEqual(["new"]);
    expect(newestLicensePerType([current, old]).map(entry => entry.documentId)).toEqual(["new"]);
  });
  it("keeps the latest effective date among documents that are not replaced, and a Missing row for a type with nothing", () => {
    const rows = [row("OTHER", { documentId: "a", effectiveDate: "2025-05-01" }), row("OTHER", { documentId: "b", effectiveDate: "2026-02-01" }), row("FOOD_SAFETY_COMMITMENT", { documentId: null, state: "Missing", effectiveDate: null, documentNumber: null })];
    expect(newestLicensePerType(rows).map(entry => entry.documentId)).toEqual(["b", null]);
  });
  it("prefers a real document over a Missing row of the same type", () => {
    expect(newestLicensePerType([row("OTHER", { documentId: null, state: "Missing", effectiveDate: null }), row("OTHER", { documentId: "x" })]).map(entry => entry.documentId)).toEqual(["x"]);
  });
});

describe("licence reminders (display only)", () => {
  const label = (type: string) => type === "AQUACULTURE_LICENSE" ? "Giấy phép nuôi trồng" : type;
  it("reminds only for the newest licence of a type that expires soon or expired", () => {
    const rows = [row("AQUACULTURE_LICENSE", { documentId: "old", state: "Expired", isReplaced: true, expiryDate: "2025-12-31", effectiveDate: "2025-01-01" }),
      row("AQUACULTURE_LICENSE", { documentId: "new", state: "ExpiringSoon", expiryDate: "2026-11-20" }), row("OTHER", { documentId: "ok" })];
    expect(licenseReminders(rows, "2026-11-12", label)).toEqual([{ key: "new", expired: false, text: "Giấy phép nuôi trồng GP-1: còn 8 ngày" }]);
  });
  it("words an expired one", () => {
    expect(licenseReminders([row("OTHER", { documentId: "e", state: "Expired", expiryDate: "2026-11-10" })], "2026-11-12", label)[0]).toMatchObject({ expired: true, text: "OTHER GP-1: quá hạn 2 ngày" });
  });
});

describe("zone licence flag computed from the overview", () => {
  it("is Missing without any row and when a type has no valid document", () => {
    expect(licenseFlagOf([])).toBe("Missing");
    expect(licenseFlagOf([{ state: "Valid" }, { state: "Missing" }])).toBe("Missing");
  });
  it("takes the worst state present, and Valid when everything is valid", () => {
    expect(licenseFlagOf([{ state: "Valid" }, { state: "Expired" }, { state: "ExpiringSoon" }])).toBe("Expired");
    expect(licenseFlagOf([{ state: "Valid" }, { state: "ExpiringSoon" }])).toBe("ExpiringSoon");
    expect(licenseFlagOf([{ state: "Valid" }, { state: "Valid" }])).toBe("Valid");
  });
});
