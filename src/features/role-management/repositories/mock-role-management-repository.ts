import type {
  FeatureCatalogItem,
  RoleDetails,
  RoleMutationResult,
  SaveRoleInput,
} from "@/features/role-management/domain/role-management";
import type { RoleManagementRepository } from "@/features/role-management/repositories/role-management-repository";
import {
  cloneCatalog,
  cloneImpactAccounts,
  clonePermissions,
  cloneRole,
  createRoleConflictResult,
} from "@/features/role-management/repositories/mock-role-management-helpers";
import { createMockRoleLifecycleMethods } from "@/features/role-management/repositories/mock-role-lifecycle-methods";
import { validateMockRoleSave } from "@/features/role-management/repositories/mock-role-save-validation";
import {
  createMockRolePrepareRequest,
  createMockRoleStore,
  type MockRoleUsageProvider,
} from "@/features/role-management/repositories/mock-role-store";

type MockRoleManagementOptions = Readonly<{
  fixedNames?: Readonly<Record<string, string>>;
  getUsage?: MockRoleUsageProvider;
  catalog: readonly FeatureCatalogItem[];
  initialRoles: readonly RoleDetails[];
  isAuthorized?: boolean;
  isSessionExpired?: boolean;
  latencyMs?: number;
}>;

/** In-memory role store used by tests and mock mode. */
export function createMockRoleManagementRepository({
  fixedNames,
  getUsage,
  catalog,
  initialRoles,
  isAuthorized = true,
  isSessionExpired = false,
  latencyMs = 350,
}: MockRoleManagementOptions): RoleManagementRepository &
  Readonly<{ snapshotRoles(): readonly RoleDetails[] }> {
  const store = createMockRoleStore(initialRoles, getUsage);
  const prepareRequest = createMockRolePrepareRequest({
    isAuthorized,
    isSessionExpired,
    latencyMs,
  });

  return {
    snapshotRoles: () => store.all().map((role) => cloneRole(store.withUsage(role))),
    async load() {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;

      return {
        status: "loaded",
        workspace: {
          catalog: cloneCatalog(catalog),
          roles: store.all().map((role) => cloneRole(store.withUsage(role))),
        },
      };
    },

    async save(input: SaveRoleInput): Promise<RoleMutationResult> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;

      const validation = validateMockRoleSave(input, { catalog, fixedNames, roles: store.all() });
      if (validation.rejection) return validation.rejection;

      const currentRole = input.id ? store.findWithUsage(input.id) : undefined;
      if (fixedNames && currentRole?.status === "discontinued") {
        return { status: "forbidden", message: { code: "MSG02" } };
      }
      if (
        input.id &&
        (!currentRole || currentRole.recordVersion !== input.recordVersion)
      ) {
        return createRoleConflictResult();
      }

      if (
        currentRole &&
        currentRole.activeAccountCount > 0 &&
        !input.confirmImpact
      ) {
        return {
          impactAccounts: cloneImpactAccounts(currentRole.impactAccounts),
          message: {
            code: "MSG09",
            params: { action: `cập nhật vai trò ${currentRole.name}` },
          },
          status: "impact-confirmation-required",
        };
      }

      const recordVersion = store.nextRecordVersion();
      const savedRole: RoleDetails = currentRole
        ? {
            ...currentRole,
            description: input.description,
            name: validation.name,
            permissions: clonePermissions(input.permissions),
            recordVersion,
          }
        : {
            activeAccountCount: 0,
            activeZoneCount: 0,
            description: input.description,
            id: store.nextRoleId(),
            impactAccounts: [],
            name: validation.name,
            permissions: clonePermissions(input.permissions),
            recordVersion,
            status: "in-use",
          };

      if (currentRole) store.replace(savedRole);
      else store.append(savedRole);

      return {
        message: { code: "MSG10", params: { object_name: "Vai trò" } },
        role: cloneRole(savedRole),
        status: "saved",
      };
    },

    ...createMockRoleLifecycleMethods({ fixedNames, prepareRequest, store }),
  };
}
