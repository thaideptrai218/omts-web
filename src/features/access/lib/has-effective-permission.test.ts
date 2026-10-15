import { describe, expect, it } from "vitest";
import type { EffectiveAccess } from "@/features/access/domain/access-types";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";

describe("hasEffectivePermission", () => {
  it("allows every zone when the effective scope is all-zones", () => {
    const access: EffectiveAccess = {
      permissions: [
        {
          key: "workspace.overview.view",
          scope: { kind: "all-zones" },
        },
      ],
    };

    expect(
      hasEffectivePermission(access, "workspace.overview.view", "zone-unknown"),
    ).toBe(true);
  });

  it("allows only zones included in a scoped permission", () => {
    const access: EffectiveAccess = {
      permissions: [
        {
          key: "workspace.overview.view",
          scope: { kind: "zones", zoneIds: ["zone-a"] },
        },
      ],
    };

    expect(hasEffectivePermission(access, "workspace.overview.view", "zone-a")).toBe(
      true,
    );
    expect(hasEffectivePermission(access, "workspace.overview.view", "zone-b")).toBe(
      false,
    );
  });

  it("denies access when the permission is absent", () => {
    expect(
      hasEffectivePermission({ permissions: [] }, "workspace.overview.view"),
    ).toBe(false);
  });
});
