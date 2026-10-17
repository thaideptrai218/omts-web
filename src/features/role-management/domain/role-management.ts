import type { AppMessage } from "@/shared/messages/message-catalog";

export type RoleStatus = "discontinued" | "in-use";

export type PermissionAction = Readonly<{
  category: "create" | "delete" | "edit" | "other" | "view";
  key: string;
  label: string;
}>;

export type DataScopeOption = Readonly<{
  id: string;
  label: string;
}>;

export type FeatureCatalogItem = Readonly<{
  code: string;
  description?: string;
  groupLabel: string;
  label: string;
  supportedActions: readonly PermissionAction[];
  scope?: Readonly<{
    options: readonly DataScopeOption[];
    requiredWhenGranted: boolean;
  }>;
}>;

export type RolePermission = Readonly<{
  actionKeys: readonly string[];
  dataScopeId: string | null;
  featureCode: string;
}>;

export type RoleSummary = Readonly<{
  activeAccountCount: number;
  activeZoneCount: number;
  description: string;
  id: string;
  name: string;
  status: RoleStatus;
}>;

export type RoleImpactAccount = Readonly<{
  accountId: string;
  displayName: string;
  username: string;
  zoneLabels: readonly string[];
}>;

export type RoleDetails = RoleSummary &
  Readonly<{
    impactAccounts: readonly RoleImpactAccount[];
    permissions: readonly RolePermission[];
    recordVersion: string;
  }>;

export type RoleWorkspace = Readonly<{
  catalog: readonly FeatureCatalogItem[];
  roles: readonly RoleDetails[];
}>;

export type SaveRoleInput = Readonly<{
  confirmImpact: boolean;
  description: string;
  id: string | null;
  name: string;
  permissions: readonly RolePermission[];
  recordVersion: string | null;
}>;

export type DiscontinueRoleInput = Readonly<{
  id: string;
  recordVersion: string;
}>;

type SessionExpiredResult = Readonly<{
  message: AppMessage & { code: "MSG19" };
  status: "session-expired";
}>;

type ForbiddenResult = Readonly<{
  message: AppMessage & { code: "MSG02" };
  status: "forbidden";
}>;

export type LoadRoleWorkspaceResult =
  | Readonly<{ status: "loaded"; workspace: RoleWorkspace }>
  | ForbiddenResult
  | SessionExpiredResult;

export type RoleMutationResult =
  | Readonly<{
      message: AppMessage & { code: "MSG10" };
      role: RoleDetails;
      status: "saved";
    }>
  | Readonly<{
      field?: "name" | `permission:${string}`;
      message: AppMessage & { code: "MSG01" };
      status: "invalid-input";
    }>
  | Readonly<{
      existingRoleId: string;
      message: AppMessage & { code: "MSG03" };
      status: "duplicate-name";
    }>
  | Readonly<{
      message: AppMessage & { code: "MSG06" };
      status: "conflict";
    }>
  | Readonly<{
      impactAccounts: readonly RoleImpactAccount[];
      message: AppMessage & { code: "MSG09" };
      status: "impact-confirmation-required";
    }>
  | ForbiddenResult
  | SessionExpiredResult;

export type DiscontinueRoleResult =
  | Readonly<{
      message: AppMessage & { code: "MSG10" };
      role: RoleDetails;
      status: "discontinued";
    }>
  | Readonly<{
      impactAccounts: readonly RoleImpactAccount[];
      message: AppMessage & { code: "MSG11" };
      status: "role-in-use";
    }>
  | Readonly<{
      message: AppMessage & { code: "MSG06" };
      status: "conflict";
    }>
  | ForbiddenResult
  | SessionExpiredResult;
