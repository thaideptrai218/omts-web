export const effectivePermissionKeys = [
  "access.accounts.manage",
  "access.roles.manage",
  "cooperative.employees.manage",
  "cooperative.profile.manage",
  "platform.cooperative.provision",
  "workspace.overview.view",
  "farming.zones.view",
  "farming.zones.manage",
  "farming.rafts.view",
] as const;

export type EffectivePermissionKey = (typeof effectivePermissionKeys)[number];

export type AccessScope =
  | Readonly<{ kind: "global" }>
  | Readonly<{ kind: "all-zones" }>
  | Readonly<{ kind: "zones"; zoneIds: readonly string[] }>;

export type EffectivePermission = Readonly<{
  key: EffectivePermissionKey;
  scope: AccessScope;
}>;

// UI capabilities, not a substitute for function/record-level authorization.
export type EffectiveAccess = Readonly<{
  permissions: readonly EffectivePermission[];
}>;
