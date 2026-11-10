"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { RoleEditorAlert } from "@/features/role-management/components/role-editor-alert";
import { RoleEditorDialogs } from "@/features/role-management/components/role-editor-dialogs";
import { RoleEditorFooter } from "@/features/role-management/components/role-editor-footer";
import { RoleEditorHeader } from "@/features/role-management/components/role-editor-header";
import type {
  RoleEditorAlert as RoleEditorAlertValue,
  RoleEditorMode,
} from "@/features/role-management/components/role-editor-model";
import {
  RoleReadOnlyNotice,
  RoleUsageSummary,
} from "@/features/role-management/components/role-editor-notices";
import { RoleMetadataFields } from "@/features/role-management/components/role-metadata-fields";
import { RolePermissionMatrixSection } from "@/features/role-management/components/role-permission-matrix-section";
import { useRoleDraft } from "@/features/role-management/components/use-role-draft";
import { useRoleSave } from "@/features/role-management/components/use-role-save";
import { useRoleStatusActions } from "@/features/role-management/components/use-role-status-actions";
import type {
  FeatureCatalogItem,
  RoleDetails,
  RoleImpactAccount,
} from "@/features/role-management/domain/role-management";

export type { RoleEditorMode };

type RoleEditorProps = Readonly<{
  catalog: readonly FeatureCatalogItem[];
  embedded?: boolean;
  fixedName?: boolean;
  onPendingChange?(pending: boolean): void;
  mode: RoleEditorMode;
  onOpenExisting(roleId: string): void;
  onReload(): void;
  onSaved(role: RoleDetails): void;
  role?: RoleDetails;
}>;

export function RoleEditor({
  catalog,
  embedded = false,
  fixedName = false,
  onPendingChange,
  mode,
  onOpenExisting,
  onReload,
  onSaved,
  role,
}: RoleEditorProps) {
  const { notify } = useToast();
  const {
    description,
    hasChanges,
    name,
    nameError,
    nameInputRef,
    permissionErrors,
    permissions,
    resetFields,
    setDescription,
    setName,
    setNameError,
    setPermissionErrors,
    setPermissions,
    validateDraft,
  } = useRoleDraft({ catalog, mode, role });
  const [alert, setAlert] = useState<RoleEditorAlertValue>();
  const [duplicateRoleId, setDuplicateRoleId] = useState<string>();
  const [impactAccounts, setImpactAccounts] = useState<
    readonly RoleImpactAccount[]
  >([]);
  const [isImpactDialogOpen, setIsImpactDialogOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const statusActions = useRoleStatusActions({
    isPending,
    onSaved,
    role,
    setAlert,
    setImpactAccounts,
    setIsPending,
  });
  const isExistingRole = mode === "edit" && Boolean(role);
  const isReadOnly = isExistingRole && role?.status === "discontinued";
  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  function resetDraft() {
    resetFields();
    setAlert(undefined);
    setDuplicateRoleId(undefined);
  }

  const { save } = useRoleSave({
    description,
    isExistingRole,
    isPending,
    isReadOnly,
    name,
    nameInputRef,
    notify,
    onSaved,
    permissions,
    role,
    setAlert,
    setDuplicateRoleId,
    setImpactAccounts,
    setIsImpactDialogOpen,
    setIsPending,
    setNameError,
    setPermissionErrors,
    validateDraft,
  });

  return (
    <section
      className={
        embedded
          ? "min-w-0"
          : "min-w-0 rounded-card border border-border bg-surface shadow-card"
      }
    >
      {!embedded && (
        <RoleEditorHeader
          isExistingRole={isExistingRole}
          mode={mode}
          role={role}
        />
      )}

      <div className={`space-y-6 ${embedded ? "" : "p-5 sm:p-6"}`}>
        {isReadOnly && <RoleReadOnlyNotice fixedName={fixedName} />}

        <RoleMetadataFields
          description={description}
          disabled={isReadOnly || isPending}
          fixedName={fixedName}
          name={name}
          nameError={nameError}
          nameInputRef={nameInputRef}
          onDescriptionChange={setDescription}
          onNameChange={(value) => {
            setName(value);
            setNameError(undefined);
          }}
        />

        {isExistingRole && role && role.activeAccountCount > 0 && (
          <RoleUsageSummary role={role} />
        )}

        <RolePermissionMatrixSection
          catalog={catalog}
          disabled={isReadOnly || isPending}
          errors={permissionErrors}
          onChange={(nextPermissions) => {
            setPermissions(nextPermissions);
            setPermissionErrors({});
          }}
          permissions={permissions}
        />

        {alert && (
          <RoleEditorAlert
            alert={alert}
            duplicateRoleId={duplicateRoleId}
            impactAccounts={impactAccounts}
            onOpenExisting={onOpenExisting}
            onReload={onReload}
          />
        )}

        <RoleEditorFooter
          canDiscontinue={isExistingRole && role?.status === "in-use"}
          canReactivate={fixedName && isReadOnly}
          hasChanges={hasChanges}
          isExistingRole={isExistingRole}
          isPending={isPending}
          isReadOnly={isReadOnly}
          onDiscontinue={() => statusActions.setIsDiscontinueDialogOpen(true)}
          onReactivate={() => statusActions.setIsReactivateDialogOpen(true)}
          onReset={resetDraft}
          onSave={() => void save(false)}
        />
      </div>

      <RoleEditorDialogs
        draftName={name}
        impactAccounts={impactAccounts}
        isImpactDialogOpen={isImpactDialogOpen}
        isPending={isPending}
        onConfirmImpact={() => void save(true)}
        onImpactDialogOpenChange={setIsImpactDialogOpen}
        roleName={role?.name}
        statusActions={statusActions}
      />
    </section>
  );
}
