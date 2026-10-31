import { expect, it } from "vitest";
import { createMockManagementEnvironment } from "./mock-management-environment";
import { createManagedMockAuth } from "./managed-mock-auth";
import { resolveMockZoneAccess } from "./mock-zone-access";

it("propagates one zone rename to employee/account options, role impact and Staff identity without changing grants", async () => {
  const environment = createMockManagementEnvironment(0);
  const before = environment.accounts.snapshotAccounts();
  const owner = environment.zones.forAccess(() =>
    resolveMockZoneAccess(
      "account-owner-demo",
      environment.accounts.snapshotAccounts(),
      environment.roles.snapshotRoles(),
      environment.zones.snapshotOptions(),
    ),
  );
  const zone = environment.zones.snapshotZones()[0];
  const renamed = await owner.save({
    ...zone,
    latitude: String(zone.latitude),
    longitude: String(zone.longitude),
    area: String(zone.area),
    name: "Vùng nuôi được đổi tên",
  });
  expect(renamed.status).toBe("saved");
  for (const result of [
    await environment.accounts.load(),
    await environment.employees.load(),
  ]) {
    expect(result).toMatchObject({
      status: "loaded",
      workspace: {
        zones: expect.arrayContaining([
          { id: zone.id, label: "Vùng nuôi được đổi tên", status: "in-use" },
        ]),
      },
    });
  }
  expect(
    environment.roles
      .snapshotRoles()
      .find((role) => role.id === "role-zone-manager")?.impactAccounts,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ zoneLabels: ["Vùng nuôi được đổi tên"] }),
    ]),
  );
  const auth = createManagedMockAuth(environment);
  expect(auth.resolve("nguyen.an")?.account.scopeLabel).toBe(
    "Vùng nuôi được đổi tên",
  );
  expect(auth.profile("account-nguyen-an")?.roles[0].scopeLabel).toBe(
    "Vùng nuôi được đổi tên",
  );
  expect(environment.accounts.snapshotAccounts()).toEqual(before);
  expect((await environment.dashboard.load()).access.zoneInUseCount).toBe(2);
});
it("does not expose zone Create/Edit in the fixed-role permission editor", async () => {
  const environment = createMockManagementEnvironment(0);
  const loaded = await environment.roles.load();
  if (loaded.status !== "loaded") throw new Error("Expected workspace");
  expect(
    loaded.workspace.catalog
      .find((feature) => feature.code === "FARMING_ZONE")
      ?.supportedActions.map((action) => action.key),
  ).toEqual(["VIEW"]);
  const access = resolveMockZoneAccess(
    "account-nguyen-an",
    environment.accounts.snapshotAccounts(),
    environment.roles.snapshotRoles(),
    environment.zones.snapshotOptions(),
    "2026-10-28",
  );
  expect(access).toMatchObject({
    canWrite: false,
    visibleZoneIds: ["zone-east"],
  });
  expect(
    resolveMockZoneAccess(
      "account-nguyen-an",
      environment.accounts.snapshotAccounts(),
      environment.roles.snapshotRoles(),
      environment.zones.snapshotOptions(),
      "2026-01-01",
    ),
  ).toBeNull();
});
