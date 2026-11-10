import type { RoleDetails } from "@/features/role-management/domain/role-management";
import {
  cloneRole,
  wait,
} from "@/features/role-management/repositories/mock-role-management-helpers";

export type MockRoleUsageProvider = (
  roleId: string,
) => Pick<RoleDetails, "activeAccountCount" | "activeZoneCount" | "impactAccounts">;

/**
 * Simulated latency plus session/permission checks run before each mock role request.
 * Returns an early result when the request must stop, otherwise `undefined`.
 */
export function createMockRolePrepareRequest({
  isAuthorized,
  isSessionExpired,
  latencyMs,
}: Readonly<{ isAuthorized: boolean; isSessionExpired: boolean; latencyMs: number }>) {
  return async function prepareRequest() {
    if (latencyMs > 0) await wait(latencyMs);

    if (isSessionExpired) {
      return { message: { code: "MSG19" }, status: "session-expired" } as const;
    }
    if (!isAuthorized) {
      return { message: { code: "MSG02" }, status: "forbidden" } as const;
    }
  };
}

export type MockRolePrepareRequest = ReturnType<typeof createMockRolePrepareRequest>;

/**
 * Mutable in-memory role list with the id/version counters of the mock backend.
 * `findWithUsage` merges live account usage (from the account store) into a role.
 */
export function createMockRoleStore(
  initialRoles: readonly RoleDetails[],
  getUsage: MockRoleUsageProvider | undefined,
) {
  let roles = initialRoles.map(cloneRole);
  let nextRoleNumber = roles.length + 1;
  let nextVersion = roles.length + 1;

  function withUsage(role: RoleDetails): RoleDetails {
    return getUsage ? { ...role, ...getUsage(role.id) } : role;
  }

  return {
    all: (): readonly RoleDetails[] => roles,
    withUsage,
    findWithUsage(id: string): RoleDetails | undefined {
      const role = roles.find((role) => role.id === id);
      return role ? withUsage(role) : undefined;
    },
    replace(savedRole: RoleDetails) {
      roles = roles.map((role) => (role.id === savedRole.id ? savedRole : role));
    },
    append(savedRole: RoleDetails) {
      roles = [...roles, savedRole];
    },
    nextRecordVersion: () => `role-v${++nextVersion}`,
    nextRoleId: () => `role-${nextRoleNumber++}`,
  };
}

export type MockRoleStore = ReturnType<typeof createMockRoleStore>;
