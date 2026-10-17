import type {
  ChangeAccountStatusInput,
  ResetPasswordInput,
  RevokeGrantInput,
  SaveAccountInput,
} from "@/features/account-management/domain/account-management";
import type { AccountManagementRepository } from "@/features/account-management/repositories/account-management-repository";

export class AccountManagementService {
  constructor(private readonly repository: AccountManagementRepository) {}

  load() {
    return this.repository.load();
  }

  save(input: SaveAccountInput) {
    return this.repository.save({
      ...input,
      displayName: input.displayName.trim(),
      email: input.email.trim(),
      newGrants: input.newGrants.map((grant) => ({ ...grant })),
      phone: input.phone.trim(),
      username: input.username.trim(),
    });
  }

  changeStatus(input: ChangeAccountStatusInput) {
    return this.repository.changeStatus({ ...input, reason: input.reason.trim() });
  }

  revokeGrant(input: RevokeGrantInput) {
    return this.repository.revokeGrant({ ...input, reason: input.reason.trim() });
  }

  resetPassword(input: ResetPasswordInput) {
    return this.repository.resetPassword(input);
  }
}
