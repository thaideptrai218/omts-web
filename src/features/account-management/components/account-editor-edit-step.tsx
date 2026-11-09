import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { AccessGrantEditor } from "@/features/account-management/components/access-grant-editor";
import { AccountDetailsFieldset } from "@/features/account-management/components/account-details-fieldset";
import type {
  AccessGrant,
  AccountManagementWorkspace,
  GrantDraft,
  ManagedAccount,
} from "@/features/account-management/domain/account-management";
import type { AccountEditorValues } from "@/features/account-management/schemas/account-editor-schema";

type AccountEditorEditStepProps = Readonly<{
  /** Undefined while creating a new account. */
  account?: ManagedAccount;
  accountantRoleIds: readonly string[];
  drafts: readonly GrantDraft[];
  errors: FieldErrors<AccountEditorValues>;
  grantError: string;
  hasChanges: boolean;
  onDraftsChange(drafts: readonly GrantDraft[]): void;
  onRevoke(grant: AccessGrant): void;
  onSubmit(): void;
  register: UseFormRegister<AccountEditorValues>;
  unavailableRoleIds: readonly string[];
  workspace: AccountManagementWorkspace;
}>;

/** Step 1: account details plus zone-role grant rows. Submitting moves to the preview. */
export function AccountEditorEditStep({
  account,
  accountantRoleIds,
  drafts,
  errors,
  grantError,
  hasChanges,
  onDraftsChange,
  onRevoke,
  onSubmit,
  register,
  unavailableRoleIds,
  workspace,
}: AccountEditorEditStepProps) {
  return (
    <form
      className="mt-6 space-y-7"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <AccountDetailsFieldset
        account={account}
        errors={errors}
        register={register}
      />

      {/* Focus target when grant validation fails. */}
      <div className="min-w-0 outline-none" id="account-grants" tabIndex={-1}>
        <AccessGrantEditor
          allZonesOnlyRoleIds={accountantRoleIds}
          currentGrants={account?.grants ?? []}
          drafts={drafts}
          error={grantError}
          onChange={onDraftsChange}
          onRevoke={onRevoke}
          roles={workspace.roles}
          unavailableRoleIds={unavailableRoleIds}
          zones={workspace.zones}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button className="sm:w-auto" disabled={!hasChanges} type="submit">
          Xem quyền hiệu lực
        </Button>
      </div>
    </form>
  );
}
