"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import type { useToast } from "@/components/ui/toast-provider";
import type { RoleEditorAlert } from "@/features/role-management/components/role-editor-model";
import type {
  RoleDetails,
  RoleImpactAccount,
  SaveRoleInput,
} from "@/features/role-management/domain/role-management";
import { roleManagementService } from "@/features/role-management/services/role-management-service.instance";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

/** Draft values, state setters and callbacks the role save flow needs. */
export type RoleSaveDeps = Readonly<{
  description: string;
  isExistingRole: boolean;
  isPending: boolean;
  isReadOnly: boolean;
  name: string;
  nameInputRef: RefObject<HTMLInputElement | null>;
  notify: ReturnType<typeof useToast>["notify"];
  onSaved(role: RoleDetails): void;
  permissions: SaveRoleInput["permissions"];
  role?: RoleDetails;
  setAlert: Dispatch<SetStateAction<RoleEditorAlert | undefined>>;
  setDuplicateRoleId: Dispatch<SetStateAction<string | undefined>>;
  setImpactAccounts: Dispatch<SetStateAction<readonly RoleImpactAccount[]>>;
  setIsImpactDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsPending: Dispatch<SetStateAction<boolean>>;
  setNameError: Dispatch<SetStateAction<string | undefined>>;
  setPermissionErrors: Dispatch<SetStateAction<Record<string, string>>>;
  validateDraft(): boolean;
}>;

/**
 * Save a role draft (optionally after the impact confirmation) and map each
 * service result onto the editor's alert, field errors and impact dialog.
 */
export function useRoleSave(deps: RoleSaveDeps) {
  const {
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
  } = deps;

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

  return { save };
}
