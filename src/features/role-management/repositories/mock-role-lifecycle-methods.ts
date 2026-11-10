import type {
  DiscontinueRoleInput,
  DiscontinueRoleResult,
  ReactivateRoleResult,
  RoleDetails,
} from "@/features/role-management/domain/role-management";
import {
  cloneImpactAccounts,
  cloneRole,
  createRoleConflictResult,
} from "@/features/role-management/repositories/mock-role-management-helpers";
import type {
  MockRolePrepareRequest,
  MockRoleStore,
} from "@/features/role-management/repositories/mock-role-store";

/**
 * Discontinue/reactivate operations of the mock role repository. A role still used
 * by active accounts cannot be discontinued; with fixed roles only known ids reactivate.
 */
export function createMockRoleLifecycleMethods({
  fixedNames,
  prepareRequest,
  store,
}: Readonly<{
  fixedNames?: Readonly<Record<string, string>>;
  prepareRequest: MockRolePrepareRequest;
  store: MockRoleStore;
}>) {
  return {
    async discontinue(
      input: DiscontinueRoleInput,
    ): Promise<DiscontinueRoleResult> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;

      const currentRole = store.findWithUsage(input.id);
      if (!currentRole || currentRole.recordVersion !== input.recordVersion) {
        return createRoleConflictResult();
      }

      if (currentRole.activeAccountCount > 0) {
        return {
          impactAccounts: cloneImpactAccounts(currentRole.impactAccounts),
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

      const discontinuedRole: RoleDetails = {
        ...currentRole,
        recordVersion: store.nextRecordVersion(),
        status: "discontinued",
      };
      store.replace(discontinuedRole);

      return {
        message: { code: "MSG10", params: { object_name: "Vai trò" } },
        role: cloneRole(discontinuedRole),
        status: "discontinued",
      };
    },

    async reactivate(
      input: DiscontinueRoleInput,
    ): Promise<ReactivateRoleResult> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;
      if (fixedNames && !Object.hasOwn(fixedNames, input.id)) {
        return { status: "forbidden", message: { code: "MSG02" } };
      }
      const currentRole = store.findWithUsage(input.id);
      if (!currentRole || currentRole.recordVersion !== input.recordVersion) {
        return createRoleConflictResult();
      }
      const restored: RoleDetails =
        currentRole.status === "in-use"
          ? currentRole
          : {
              ...currentRole,
              status: "in-use",
              recordVersion: store.nextRecordVersion(),
            };
      store.replace(restored);
      return {
        status: "reactivated",
        role: cloneRole(restored),
        message: { code: "MSG10", params: { object_name: "Vai trò" } },
      };
    },
  };
}
