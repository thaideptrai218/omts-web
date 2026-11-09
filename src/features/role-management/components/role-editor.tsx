"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { PermissionMatrixEditor } from "@/features/role-management/components/permission-matrix-editor";
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
import { useRoleDraft } from "@/features/role-management/components/use-role-draft";
import { useRoleStatusActions } from "@/features/role-management/components/use-role-status-actions";
import type {
  FeatureCatalogItem,
  RoleDetails,
  RoleImpactAccount,
  SaveRoleInput,
} from "@/features/role-management/domain/role-management";
import { roleManagementService } from "@/features/role-management/services/role-management-service.instance";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

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

  function createSaveInput(confirmImpact: boolean): SaveRoleInput {
    return {
      confirmImpact,
      description,
      id: isExistingRole ? (role?.id ?? null) : null,
      name,
      permissions,
      recordVersion: isExistingRole ? (role?.recordVersion ?? null) : null,
    };
  }

  async function save(confirmImpact: boolean) {
    if (isPending || isReadOnly || !validateDraft()) return;

    setAlert(undefined);
    setDuplicateRoleId(undefined);
    setIsPending(true);

    try {
      const result = await roleManagementService.save(
        createSaveInput(confirmImpact),
      );

      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
        return;
      }
      if (result.status === "forbidden") {
        setAlert({ message: formatMessage(result.message), tone: "danger" });
        return;
      }
      if (result.status === "invalid-input") {
        setAlert({ message: formatMessage(result.message), tone: "danger" });
        if (result.field === "name") {
          setNameError(formatMessage(result.message));
          nameInputRef.current?.focus();
        } else if (result.field?.startsWith("permission:")) {
          const featureCode = result.field.slice("permission:".length);
          setPermissionErrors((current) => ({
            ...current,
            [featureCode]: formatMessage(result.message),
          }));
        }
        return;
      }
      if (result.status === "duplicate-name") {
        setNameError(formatMessage(result.message));
        setDuplicateRoleId(result.existingRoleId);
        setAlert({ message: formatMessage(result.message), tone: "danger" });
        nameInputRef.current?.focus();
        return;
      }
      if (result.status === "conflict") {
        setAlert({ message: formatMessage(result.message), tone: "warning" });
        return;
      }
      if (result.status === "impact-confirmation-required") {
        setImpactAccounts(result.impactAccounts);
        setIsImpactDialogOpen(true);
        return;
      }

      setIsImpactDialogOpen(false);
      notify({ title: "Vai trò đã được lưu.", tone: "success" });
      onSaved(result.role);
    } catch {
      setAlert({ message: formatMessage({ code: "MSG04" }), tone: "danger" });
    } finally {
      setIsPending(false);
    }
  }

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

        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-text">Ma trận quyền</h3>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Chọn quyền theo từng chức năng. Khi có quyền thao tác, quyền Xem
              được bật và giữ tự động.
            </p>
          </div>
          <PermissionMatrixEditor
            catalog={catalog}
            disabled={isReadOnly || isPending}
            errors={permissionErrors}
            onChange={(nextPermissions) => {
              setPermissions(nextPermissions);
              setPermissionErrors({});
            }}
            permissions={permissions}
          />
        </div>

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
