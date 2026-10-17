import type {
  DiscontinueRoleInput,
  DiscontinueRoleResult,
  LoadRoleWorkspaceResult,
  RoleMutationResult,
  SaveRoleInput,
} from "@/features/role-management/domain/role-management";

export interface RoleManagementRepository {
  discontinue(input: DiscontinueRoleInput): Promise<DiscontinueRoleResult>;
  load(): Promise<LoadRoleWorkspaceResult>;
  save(input: SaveRoleInput): Promise<RoleMutationResult>;
}
