export type EffectivePermissionKey =
  | "access.accounts.manage"
  | "access.roles.manage"
  | "cooperative.employees.manage"
  | "cooperative.profile.manage"
  | "platform.cooperative.provision"
  | "workspace.overview.view";

export type AccessScope =
  | Readonly<{ kind: "global" }>
  | Readonly<{ kind: "all-zones" }>
  | Readonly<{ kind: "zones"; zoneIds: readonly string[] }>;

export type EffectivePermission = Readonly<{
  key: EffectivePermissionKey;
  scope: AccessScope;
}>;

export type EffectiveAccess = Readonly<{
  permissions: readonly EffectivePermission[];
}>;
