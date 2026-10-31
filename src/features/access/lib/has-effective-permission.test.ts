import { describe, expect, it } from "vitest";
import type { EffectiveAccess } from "@/features/access/domain/access-types";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";

describe("hasEffectivePermission", () => {
  it("denies an empty selected-zone scope, including menu visibility", () => {
    const access: EffectiveAccess = {
      permissions: [{ key: "workspace.overview.view", scope: { kind: "zones", zoneIds: [] } }],
    };
    expect(hasEffectivePermission(access, "workspace.overview.view")).toBe(false);
    expect(hasEffectivePermission(access, "workspace.overview.view", "zone-a")).toBe(false);
  });

  it("unions matching entries instead of stopping at the first grant", () => {
    const access: EffectiveAccess = { permissions: [
      { key: "workspace.overview.view", scope: { kind: "zones", zoneIds: ["zone-a"] } },
      { key: "workspace.overview.view", scope: { kind: "zones", zoneIds: ["zone-b"] } },
    ] };
    expect(hasEffectivePermission(access, "workspace.overview.view", "zone-b")).toBe(true);
    expect(hasEffectivePermission(access, "workspace.overview.view", "zone-c")).toBe(false);
    expect(hasEffectivePermission(access, "workspace.overview.view", "")).toBe(false);
  });

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

  it("allows a platform-wide permission without a farming-zone scope", () => {
    expect(
      hasEffectivePermission(
        {
          permissions: [
            {
              key: "platform.cooperative.provision",
              scope: { kind: "global" },
            },
          ],
        },
        "platform.cooperative.provision",
      ),
    ).toBe(true);
  });

  it("recognizes the Owner capability for cooperative profile management", () => {
    expect(
      hasEffectivePermission(
        {
          permissions: [
            {
              key: "cooperative.profile.manage",
              scope: { kind: "all-zones" },
            },
          ],
        },
        "cooperative.profile.manage",
      ),
    ).toBe(true);
  });

  it("recognizes the Owner capability for internal account management", () => {
    expect(
      hasEffectivePermission(
        {
          permissions: [
            {
              key: "access.accounts.manage",
              scope: { kind: "all-zones" },
            },
          ],
        },
        "access.accounts.manage",
      ),
    ).toBe(true);
  });

  it("recognizes the Owner capability for employee management", () => {
    expect(
      hasEffectivePermission(
        {
          permissions: [
            {
              key: "cooperative.employees.manage",
              scope: { kind: "all-zones" },
            },
          ],
        },
        "cooperative.employees.manage",
      ),
    ).toBe(true);
  });
});
