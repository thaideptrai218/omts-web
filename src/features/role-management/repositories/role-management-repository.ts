import type {
  DiscontinueRoleInput,
  DiscontinueRoleResult,
  LoadRoleWorkspaceResult,
  RoleMutationResult,
  SaveRoleInput,
  ReactivateRoleResult,
} from "@/features/role-management/domain/role-management";

export interface RoleManagementRepository {
  reactivate(input: DiscontinueRoleInput): Promise<ReactivateRoleResult>;
  discontinue(input: DiscontinueRoleInput): Promise<DiscontinueRoleResult>;
  load(): Promise<LoadRoleWorkspaceResult>;
  save(input: SaveRoleInput): Promise<RoleMutationResult>;
}
