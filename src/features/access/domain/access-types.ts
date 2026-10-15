export type EffectivePermissionKey = "workspace.overview.view";

export type AccessScope =
  | Readonly<{ kind: "all-zones" }>
  | Readonly<{ kind: "zones"; zoneIds: readonly string[] }>;

export type EffectivePermission = Readonly<{
  key: EffectivePermissionKey;
  scope: AccessScope;
}>;

export type EffectiveAccess = Readonly<{
  permissions: readonly EffectivePermission[];
}>;
