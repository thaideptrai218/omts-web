import { describe, expect, it } from "vitest";
import { createMockDashboardRepository } from "@/features/dashboard/repositories/mock-dashboard-repository";
import { createDashboardService } from "@/features/dashboard/services/dashboard-service";
import { createMockManagementEnvironment } from "@/shared/mocks/mock-management-environment";

describe("dashboard service", () => {
  const service = createDashboardService(createMockDashboardRepository(0));

  it("shows Owner farming counts from the shared raft records rather than made-up operational totals", async () => {
    const environment = createMockManagementEnvironment(0);
    const view = await createDashboardService(environment.dashboard).load({
      permissions: [
        { key: "cooperative.profile.manage", scope: { kind: "all-zones" } },
        { key: "farming.rafts.view", scope: { kind: "all-zones" } },
      ],
    });
    expect(view.farming).toEqual({
      activeRaftCount: 4,
      discontinuedRaftCount: 2,
      openCycleCount: 2,
    });
  });
  it("does not expose cooperative-wide raft totals to a Staff account with only scoped raft View", async () => {
    const environment = createMockManagementEnvironment(0);
    const view = await createDashboardService(environment.dashboard).load({
      permissions: [
        {
          key: "workspace.overview.view",
          scope: { kind: "zones", zoneIds: ["zone-east"] },
        },
        {
          key: "farming.rafts.view",
          scope: { kind: "zones", zoneIds: ["zone-east"] },
        },
      ],
    });
    expect(view.farming).toBeUndefined();
    expect(view.access).toBeUndefined();
  });

  it("returns management summaries when the account has matching permissions", async () => {
    const result = await service.load({
      permissions: [
        { key: "workspace.overview.view", scope: { kind: "all-zones" } },
        { key: "cooperative.employees.manage", scope: { kind: "all-zones" } },
        { key: "access.accounts.manage", scope: { kind: "all-zones" } },
      ],
    });

    expect(result.workforce).toEqual({ employedCount: 2, leftCount: 1 });
    expect(result.access).toMatchObject({
      activeInternalAccountCount: 2,
      lockedInternalAccountCount: 1,
      roleInUseCount: 2,
      zoneInUseCount: 2,
    });
  });

  it("does not expose management summaries to an overview-only account", async () => {
    const result = await service.load({
      permissions: [
        { key: "workspace.overview.view", scope: { kind: "all-zones" } },
      ],
    });

    expect(result).toEqual({ access: undefined, workforce: undefined });
  });
});
