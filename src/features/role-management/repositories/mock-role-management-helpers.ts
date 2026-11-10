import type {
  FeatureCatalogItem,
  RoleDetails,
  RoleImpactAccount,
  RolePermission,
} from "@/features/role-management/domain/role-management";

/** Simulated network latency for mock mode. */
export function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** Kết quả xung đột phiên bản dùng chung cho save/discontinue/reactivate. */
export function createRoleConflictResult() {
  return {
    message: {
      code: "MSG06",
      params: { time: "vừa xong", user_name: "một người dùng khác" },
    },
    status: "conflict",
  } as const;
}

// Deep-copy helpers keep the in-memory store isolated from caller mutations.

export function clonePermissions(
  permissions: readonly RolePermission[],
): readonly RolePermission[] {
  return permissions.map((permission) => ({
    ...permission,
    actionKeys: [...permission.actionKeys],
  }));
}

export function cloneImpactAccounts(
  accounts: readonly RoleImpactAccount[],
): RoleImpactAccount[] {
  return accounts.map((account) => ({
    ...account,
    zoneLabels: [...account.zoneLabels],
  }));
}

export function cloneRole(role: RoleDetails): RoleDetails {
  return {
    ...role,
    impactAccounts: cloneImpactAccounts(role.impactAccounts),
    permissions: clonePermissions(role.permissions),
  };
}

export function cloneCatalog(
  catalog: readonly FeatureCatalogItem[],
): FeatureCatalogItem[] {
  return catalog.map((feature) => ({
    ...feature,
    scope: feature.scope
      ? { ...feature.scope, options: [...feature.scope.options] }
      : undefined,
    supportedActions: [...feature.supportedActions],
  }));
}
