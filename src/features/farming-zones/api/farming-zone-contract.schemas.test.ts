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
    const detail = { ...row, latitude: null, longitude: null, rowVersion: "AQID" };
    expect(farmingZoneViewSchema.safeParse(detail).success).toBe(true);
    expect(farmingZoneViewSchema.safeParse({ ...detail, rowVersion: "" }).success).toBe(false);
    expect(farmingZoneViewSchema.safeParse({ ...detail, latitude: 91 }).success).toBe(false);
  });

  it("reads the saved boundary, and a malformed one as null so the zone still opens", () => {
    const detail = { ...row, latitude: 21, longitude: 107, rowVersion: "AQID" };
    const boundary = { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "Khu 1", corners: ["K1", "K2", "K3"] }, geometry: { type: "Polygon", coordinates: [[[107.1, 20.9], [107.2, 20.9], [107.2, 21], [107.1, 20.9]]] } }] };
    expect(farmingZoneViewSchema.parse(detail).boundary).toBeUndefined();
    expect(farmingZoneViewSchema.parse({ ...detail, boundary: null }).boundary).toBeNull();
    expect(farmingZoneViewSchema.parse({ ...detail, boundary }).boundary?.features).toHaveLength(1);
    const broken = farmingZoneViewSchema.safeParse({ ...detail, boundary: { type: "FeatureCollection", features: "nope" } });
    expect(broken.success).toBe(true);
    expect(broken.success && broken.data.boundary).toBeNull();
  });

  it("rejects unknown status ids and invalid raft counts", () => {
    expect(farmingZonePageSchema.safeParse({ items: [{ ...row, statusId: 301 }], page: 1, pageSize: 20, total: 1 }).success).toBe(false);
    expect(farmingZonePageSchema.safeParse({ items: [{ ...row, inUseRaftCount: -1 }], page: 1, pageSize: 20, total: 1 }).success).toBe(false);
  });
});
