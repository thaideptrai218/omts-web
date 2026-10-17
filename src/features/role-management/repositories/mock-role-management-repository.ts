import type {
  DiscontinueRoleResult,
  DiscontinueRoleInput,
  FeatureCatalogItem,
  RoleDetails,
  RoleMutationResult,
  RolePermission,
  SaveRoleInput,
} from "@/features/role-management/domain/role-management";
import { validatePermissionMatrix } from "@/features/role-management/lib/role-permission-rules";
import type { RoleManagementRepository } from "@/features/role-management/repositories/role-management-repository";
import { roleEditorSchema } from "@/features/role-management/schemas/role-editor-schema";

type MockRoleManagementOptions = Readonly<{
  catalog: readonly FeatureCatalogItem[];
  initialRoles: readonly RoleDetails[];
  isAuthorized?: boolean;
  isSessionExpired?: boolean;
  latencyMs?: number;
}>;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function clonePermissions(
  permissions: readonly RolePermission[],
): readonly RolePermission[] {
  return permissions.map((permission) => ({
    ...permission,
    actionKeys: [...permission.actionKeys],
  }));
}

function cloneRole(role: RoleDetails): RoleDetails {
  return {
    ...role,
    impactAccounts: role.impactAccounts.map((account) => ({
      ...account,
      zoneLabels: [...account.zoneLabels],
    })),
    permissions: clonePermissions(role.permissions),
  };
}

export function createMockRoleManagementRepository({
  catalog,
  initialRoles,
  isAuthorized = true,
  isSessionExpired = false,
  latencyMs = 350,
}: MockRoleManagementOptions): RoleManagementRepository {
  let roles = initialRoles.map(cloneRole);
  let nextRoleNumber = roles.length + 1;
  let nextVersion = roles.length + 1;

  async function prepareRequest() {
    if (latencyMs > 0) await wait(latencyMs);

    if (isSessionExpired) {
      return { message: { code: "MSG19" }, status: "session-expired" } as const;
    }
    if (!isAuthorized) {
      return { message: { code: "MSG02" }, status: "forbidden" } as const;
    }
  }

  function findRole(id: string): RoleDetails | undefined {
    return roles.find((role) => role.id === id);
  }

  return {
    async load() {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;

      return {
        status: "loaded",
        workspace: {
          catalog: catalog.map((feature) => ({
            ...feature,
            scope: feature.scope
              ? { ...feature.scope, options: [...feature.scope.options] }
              : undefined,
            supportedActions: [...feature.supportedActions],
          })),
          roles: roles.map(cloneRole),
        },
      };
    },

    async save(input: SaveRoleInput): Promise<RoleMutationResult> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;

      const metadata = roleEditorSchema.safeParse({
        description: input.description,
        name: input.name,
      });
      if (!metadata.success) {
        return {
          field: "name",
          message: { code: "MSG01" },
          status: "invalid-input",
        };
      }

      const matrixErrors = validatePermissionMatrix(input.permissions, catalog);
      if (matrixErrors.length > 0) {
        return {
          field: `permission:${matrixErrors[0].featureCode}` as const,
          message: { code: "MSG01" },
          status: "invalid-input",
        };
      }

      const duplicate = roles.find(
        (role) =>
          role.id !== input.id &&
          role.name.localeCompare(metadata.data.name, "vi", { sensitivity: "base" }) === 0,
      );
      if (duplicate) {
        return {
          existingRoleId: duplicate.id,
          message: { code: "MSG03", params: { object_name: "Tên vai trò" } },
          status: "duplicate-name",
        };
      }

      const currentRole = input.id ? findRole(input.id) : undefined;
      if (input.id && (!currentRole || currentRole.recordVersion !== input.recordVersion)) {
        return {
          message: {
            code: "MSG06",
            params: { time: "vừa xong", user_name: "một người dùng khác" },
          },
          status: "conflict",
        };
      }

      if (
        currentRole &&
        currentRole.activeAccountCount > 0 &&
        !input.confirmImpact
      ) {
        return {
          impactAccounts: currentRole.impactAccounts.map((account) => ({
            ...account,
            zoneLabels: [...account.zoneLabels],
          })),
          message: {
            code: "MSG09",
            params: { action: `cập nhật vai trò ${currentRole.name}` },
          },
          status: "impact-confirmation-required",
        };
      }

      nextVersion += 1;
      const savedRole: RoleDetails = currentRole
        ? {
            ...currentRole,
            description: input.description,
            name: metadata.data.name,
            permissions: clonePermissions(input.permissions),
            recordVersion: `role-v${nextVersion}`,
          }
        : {
            activeAccountCount: 0,
            activeZoneCount: 0,
            description: input.description,
            id: `role-${nextRoleNumber++}`,
            impactAccounts: [],
            name: metadata.data.name,
            permissions: clonePermissions(input.permissions),
            recordVersion: `role-v${nextVersion}`,
            status: "in-use",
          };

      roles = currentRole
        ? roles.map((role) => (role.id === savedRole.id ? savedRole : role))
        : [...roles, savedRole];

      return {
        message: { code: "MSG10", params: { object_name: "Vai trò" } },
        role: cloneRole(savedRole),
        status: "saved",
      };
    },

    async discontinue(
      input: DiscontinueRoleInput,
    ): Promise<DiscontinueRoleResult> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;

      const currentRole = findRole(input.id);
      if (!currentRole || currentRole.recordVersion !== input.recordVersion) {
        return {
          message: {
            code: "MSG06",
            params: { time: "vừa xong", user_name: "một người dùng khác" },
          },
          status: "conflict",
        };
      }

      if (currentRole.activeAccountCount > 0) {
        return {
          impactAccounts: currentRole.impactAccounts.map((account) => ({
            ...account,
            zoneLabels: [...account.zoneLabels],
          })),
          message: {
            code: "MSG11",
            params: {
              count: currentRole.activeAccountCount,
              related_list: currentRole.impactAccounts
                .map((account) => account.displayName)
                .join(", "),
            },
          },
          status: "role-in-use",
        };
      }

      nextVersion += 1;
      const discontinuedRole: RoleDetails = {
        ...currentRole,
        recordVersion: `role-v${nextVersion}`,
        status: "discontinued",
      };
      roles = roles.map((role) =>
        role.id === currentRole.id ? discontinuedRole : role,
      );

      return {
        message: { code: "MSG10", params: { object_name: "Vai trò" } },
        role: cloneRole(discontinuedRole),
        status: "discontinued",
      };
    },
  };
}
