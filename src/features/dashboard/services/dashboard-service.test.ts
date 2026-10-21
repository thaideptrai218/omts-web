import { describe, expect, it } from "vitest";
import { createMockDashboardRepository } from "@/features/dashboard/repositories/mock-dashboard-repository";
import { createDashboardService } from "@/features/dashboard/services/dashboard-service";

describe("dashboard service", () => {
  const service = createDashboardService(createMockDashboardRepository(0));

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
