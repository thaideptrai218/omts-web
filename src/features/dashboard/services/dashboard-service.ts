import type { EffectiveAccess } from "@/features/access/domain/access-types";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";
import type { DashboardView } from "@/features/dashboard/domain/dashboard";
import type { DashboardRepository } from "@/features/dashboard/repositories/dashboard-repository";

export type DashboardService = Readonly<{
  load(access: EffectiveAccess): Promise<DashboardView>;
}>;

export function createDashboardService(
  repository: DashboardRepository,
): DashboardService {
  return {
    async load(access) {
      const snapshot = await repository.load();
      const canViewWorkforce = hasEffectivePermission(
        access,
        "cooperative.employees.manage",
      );
      const canViewAccess =
        hasEffectivePermission(access, "access.accounts.manage") ||
        hasEffectivePermission(access, "access.roles.manage");

      return {
        ...(snapshot.farming &&
        hasEffectivePermission(access, "cooperative.profile.manage") &&
        hasEffectivePermission(access, "farming.rafts.view")
          ? { farming: snapshot.farming }
          : {}),
        access: canViewAccess ? snapshot.access : undefined,
        workforce: canViewWorkforce ? snapshot.workforce : undefined,
      };
    },
  };
}
