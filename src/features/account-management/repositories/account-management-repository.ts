import type {
  ChangeAccountStatusInput,
  ChangeAccountStatusResult,
  LoadAccountWorkspaceResult,
  ResetPasswordInput,
  ResetPasswordResult,
  RevokeGrantInput,
  RevokeGrantResult,
  SaveAccountInput,
  SaveAccountResult,
} from "@/features/account-management/domain/account-management";

export interface AccountManagementRepository {
  changeStatus(input: ChangeAccountStatusInput): Promise<ChangeAccountStatusResult>;
  load(): Promise<LoadAccountWorkspaceResult>;
  resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResult>;
  revokeGrant(input: RevokeGrantInput): Promise<RevokeGrantResult>;
  save(input: SaveAccountInput): Promise<SaveAccountResult>;
}
