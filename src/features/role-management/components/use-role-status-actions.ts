"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import type { RoleEditorAlert } from "@/features/role-management/components/role-editor-model";
import type {
  RoleDetails,
  RoleImpactAccount,
} from "@/features/role-management/domain/role-management";
import { roleManagementService } from "@/features/role-management/services/role-management-service.instance";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

type UseRoleStatusActionsInput = Readonly<{
  isPending: boolean;
  onSaved(role: RoleDetails): void;
  role?: RoleDetails;
  setAlert(alert: RoleEditorAlert | undefined): void;
  setImpactAccounts(accounts: readonly RoleImpactAccount[]): void;
  setIsPending(pending: boolean): void;
}>;

/**
 * Discontinue / reactivate flows of an existing role. Shares the editor's
 * pending flag so save and status changes never run concurrently.
 */
export function useRoleStatusActions({
  isPending,
  onSaved,
  role,
  setAlert,
  setImpactAccounts,
  setIsPending,
}: UseRoleStatusActionsInput) {
  const { notify } = useToast();
  const [isDiscontinueDialogOpen, setIsDiscontinueDialogOpen] = useState(false);
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false);

  async function discontinueRole() {
    if (!role || isPending) return;
    setIsPending(true);
    setAlert(undefined);

    try {
      const result = await roleManagementService.discontinue({
        id: role.id,
        recordVersion: role.recordVersion,
      });

      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
        return;
      }
      if (result.status === "forbidden") {
        setAlert({ message: formatMessage(result.message), tone: "danger" });
        return;
      }
      if (result.status === "conflict") {
        setAlert({ message: formatMessage(result.message), tone: "warning" });
        return;
      }
      if (result.status === "role-in-use") {
        setImpactAccounts(result.impactAccounts);
        setAlert({ message: formatMessage(result.message), tone: "danger" });
        return;
      }

      notify({ title: "Vai trò đã được ngừng sử dụng.", tone: "success" });
      onSaved(result.role);
    } catch {
      setAlert({ message: formatMessage({ code: "MSG04" }), tone: "danger" });
    } finally {
      setIsDiscontinueDialogOpen(false);
      setIsPending(false);
    }
  }

  async function reactivateRole() {
    if (!role || isPending) return;
    setIsPending(true);
    setAlert(undefined);
    try {
      const result = await roleManagementService.reactivate({
        id: role.id,
        recordVersion: role.recordVersion,
      });
      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
        return;
      }
      if (result.status !== "reactivated") {
        setAlert({
          message: formatMessage(result.message),
          tone: result.status === "conflict" ? "warning" : "danger",
        });
        return;
      }
      setIsReactivateDialogOpen(false);
      notify({ title: "Vai trò đã được khôi phục sử dụng.", tone: "success" });
      onSaved(result.role);
    } catch {
      setAlert({ message: formatMessage({ code: "MSG04" }), tone: "danger" });
    } finally {
      setIsReactivateDialogOpen(false);
      setIsPending(false);
    }
  }

  return {
    discontinueRole,
    isDiscontinueDialogOpen,
    isReactivateDialogOpen,
    reactivateRole,
    setIsDiscontinueDialogOpen,
    setIsReactivateDialogOpen,
  };
}

export type RoleStatusActions = ReturnType<typeof useRoleStatusActions>;
