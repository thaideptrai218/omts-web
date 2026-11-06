import { describe, expect, it } from "vitest";
import { buildEffectivePermissionPreview } from "@/features/account-management/lib/effective-permissions";
import { mockFeatureCatalog, mockRoles } from "@/features/role-management/mocks/role-management-fixtures";

const zones = [
  { id: "zone-east", label: "Khu Đông", status: "in-use" },
  { id: "zone-south", label: "Khu Nam", status: "in-use" },
] as const;

describe("buildEffectivePermissionPreview", () => {
  it("applies an all-zones grant to every effective zone", () => {
    const preview = buildEffectivePermissionPreview({
      currentGrants: [],
      featureCatalog: mockFeatureCatalog,
      newGrants: [
        {
          effectiveFrom: "2026-10-17",
          effectiveTo: "",
          key: "grant-1",
          roleId: "role-accountant",
          zoneId: "all-zones",
        },
      ],
      roles: mockRoles,
      zones,
    });

    expect(preview.map((zone) => zone.zoneLabel)).toEqual(["Khu Đông", "Khu Nam"]);
  });

  it("unions actions from multiple roles only inside the matching zone", () => {
    const preview = buildEffectivePermissionPreview({
      currentGrants: [],
      featureCatalog: mockFeatureCatalog,
      newGrants: [
        {
          effectiveFrom: "2026-10-17",
          effectiveTo: "",
          key: "grant-1",
          roleId: "role-zone-manager",
          zoneId: "zone-east",
        },
        {
          effectiveFrom: "2026-10-17",
          effectiveTo: "",
          key: "grant-2",
          roleId: "role-accountant",
          zoneId: "zone-east",
        },
      ],
      roles: mockRoles,
      zones,
    });

    const payment = preview[0]?.permissions.find(
      (permission) => permission.featureCode === "PAYMENT_RECEIPT",
    );
    expect(payment?.actionKeys).toEqual(["CREATE", "VIEW", "EDIT", "EXPORT"]);
    expect(preview).toHaveLength(1);
  });

  it("ignores revoked grants and discontinued zones", () => {
    const preview = buildEffectivePermissionPreview({
      currentGrants: [
        {
          effectiveFrom: "2026-09-01",
          effectiveTo: "2026-10-01",
          grantedBy: "owner",
          id: "old-grant",
          revocationReason: "Đổi nhiệm vụ",
          revokedAt: "2026-10-01T08:00:00.000Z",
          roleId: "role-zone-manager",
          status: "revoked",
          zoneId: "zone-east",
        },
      ],
      featureCatalog: mockFeatureCatalog,
      newGrants: [],
      roles: mockRoles,
      zones: [{ ...zones[0], status: "discontinued" }],
    });

    expect(preview).toEqual([]);
  });
});
