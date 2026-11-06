import type { AccessScope, EffectiveAccess } from "@/features/access/domain/access-types";

export const functionActions = [
  "View", "Create", "Edit", "Delete", "Export", "Import", "Approve", "Publish",
] as const;

export type FunctionAction = (typeof functionActions)[number];
export type FunctionPermission = Readonly<{
  functionCode: string;
  action: FunctionAction;
  scope: Exclude<AccessScope, { kind: "global" }>;
  dataScope: "OwnRecords" | "AssignedZone";
}>;

export type PermissionProjection = Readonly<{
  access: EffectiveAccess;
  functionPermissions: readonly FunctionPermission[];
}>;
