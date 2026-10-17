import type {
  DiscontinueRoleInput,
  RolePermission,
  SaveRoleInput,
} from "@/features/role-management/domain/role-management";
import type { RoleManagementRepository } from "@/features/role-management/repositories/role-management-repository";

function normalizePermissions(
  permissions: readonly RolePermission[],
): readonly RolePermission[] {
  return permissions.map((permission) => ({
    ...permission,
    actionKeys: [...new Set(permission.actionKeys)],
  }));
}

export class RoleManagementService {
  constructor(private readonly repository: RoleManagementRepository) {}

  load() {
    return this.repository.load();
  }

  save(input: SaveRoleInput) {
    return this.repository.save({
      ...input,
      description: input.description.trim(),
      name: input.name.trim(),
      permissions: normalizePermissions(input.permissions),
    });
  }

  discontinue(input: DiscontinueRoleInput) {
    return this.repository.discontinue(input);
  }
}
