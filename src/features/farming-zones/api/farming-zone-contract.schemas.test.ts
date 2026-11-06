import { describe, expect, it } from "vitest";
import {
  farmingZonePageSchema,
  farmingZoneViewSchema,
} from "./farming-zone-contract.schemas";

const id = "529ec3ce-af8f-42f7-a08f-4bab36ba7e62";
const row = {
  id,
  code: "KV-01",
  name: "Khu Đông",
  location: null,
  area: null,
  statusId: 101,
  status: "Đang dùng",
  inUseRaftCount: 2,
  licenseState: "ExpiringSoon",
};

describe("farming zone API contract", () => {
  it("accepts a paged list row without detail-only fields", () => {
    expect(farmingZonePageSchema.safeParse({ items: [row], page: 1, pageSize: 20, total: 1 }).success).toBe(true);
    expect(farmingZoneViewSchema.safeParse(row).success).toBe(false);
  });

  it("requires a detail row version and preserves nullable coordinates", () => {
    const detail = { ...row, latitude: null, longitude: null, waterMeasurementPoint: null, rowVersion: "AQID" };
    expect(farmingZoneViewSchema.safeParse(detail).success).toBe(true);
    expect(farmingZoneViewSchema.safeParse({ ...detail, rowVersion: "" }).success).toBe(false);
    expect(farmingZoneViewSchema.safeParse({ ...detail, latitude: 91 }).success).toBe(false);
  });

  it("rejects unknown status ids and invalid raft counts", () => {
    expect(farmingZonePageSchema.safeParse({ items: [{ ...row, statusId: 301 }], page: 1, pageSize: 20, total: 1 }).success).toBe(false);
    expect(farmingZonePageSchema.safeParse({ items: [{ ...row, inUseRaftCount: -1 }], page: 1, pageSize: 20, total: 1 }).success).toBe(false);
  });
});
