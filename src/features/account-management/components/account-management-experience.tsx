"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RestrictedAccessIcon } from "@/components/feedback/restricted-access-icon";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import {
  ManagementHeading,
  ManagementSummary,
} from "@/components/ui/management-page";
import { AccountEditor } from "@/features/account-management/components/account-editor";
import { AccountList } from "@/features/account-management/components/account-list";
import { AccountManagementPageSkeleton } from "@/features/account-management/components/account-management-page-skeleton";
import { CredentialDeliveryDialog } from "@/features/account-management/components/credential-delivery-dialog";
import type {
  AccountManagementWorkspace,
  CredentialDeliveryReceipt,
  ManagedAccount,
} from "@/features/account-management/domain/account-management";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";
import { useAuth } from "@/features/auth/state/auth-provider";
import { accountManagementService } from "@/features/account-management/services/account-management-service.instance";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

type DeliveryState = Readonly<{
  kind: "created" | "reset";
  receipt: CredentialDeliveryReceipt;
}>;

function PermissionDenied() {
  return (
    <section className="mx-auto mt-10 max-w-lg rounded-card border border-border bg-surface p-6 text-center shadow-card sm:p-8">
      <div
        aria-hidden="true"
        className="mx-auto grid size-12 place-items-center rounded-full bg-warning-soft"
      >
        <RestrictedAccessIcon />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-text">
        Không có quyền quản lý tài khoản
      </h1>
      <p className="mt-3 leading-7 text-text-muted">
        {formatMessage({ code: "MSG02" })}
      </p>
    </section>
  );
}

function requestedAccount(workspace: AccountManagementWorkspace) {
  const accountId = new URLSearchParams(window.location.search).get("accountId");
  return accountId ? workspace.accounts.find((account) => account.id === accountId) : undefined;
}

export function AccountManagementExperience() {
  const { state } = useAuth();
  const [workspace, setWorkspace] = useState<AccountManagementWorkspace>();
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [isCreating, setIsCreating] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const mutationPending = useRef(false);
  const updateMutationPending = useCallback((pending: boolean) => {
    mutationPending.current = pending;
    setIsMutating(pending);
  }, []);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [deliveryState, setDeliveryState] = useState<DeliveryState>();
  const canManage =
    state.status === "authenticated" &&
    hasEffectivePermission(state.account.access, "access.accounts.manage");
  const selectedAccount = workspace?.accounts.find(
    (account) => account.id === selectedAccountId,
  );

  async function loadWorkspace() {
    if (!canManage) return;
    setIsLoading(true);
    setHasLoadError(false);
    try {
      const result = await accountManagementService.load();
      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
        return;
      }
      if (result.status === "forbidden") {
        setHasLoadError(true);
        return;
      }
      setWorkspace(result.workspace);
      const target = requestedAccount(result.workspace);
      if (target) setIsEditorOpen(true);
      setSelectedAccountId((current) =>
        target ? target.id : result.workspace.accounts.some((account) => account.id === current)
          ? current
          : result.workspace.accounts[0]?.id,
      );
    } catch {
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;
    if (!canManage)
      return () => {
        isActive = false;
      };
    accountManagementService
      .load()
      .then((result) => {
        if (!isActive) return;
        if (result.status === "session-expired") {
          sessionExpiryChannel.publish(result.message);
          return;
        }
        if (result.status === "forbidden") {
          setHasLoadError(true);
          return;
        }
        setWorkspace(result.workspace);
        const target = requestedAccount(result.workspace);
        if (target) setIsEditorOpen(true);
        setSelectedAccountId(target?.id ?? result.workspace.accounts[0]?.id);
      })
      .catch(() => {
        if (isActive) setHasLoadError(true);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [canManage]);

  function openAccount(accountId: string) {
    setSelectedAccountId(accountId);
    setIsCreating(false);
    setIsEditorOpen(true);
  }

  function updateAccount(account: ManagedAccount) {
    setWorkspace((current) => {
      if (!current) return current;
      const exists = current.accounts.some((item) => item.id === account.id);
      return {
        ...current,
        accounts: exists
          ? current.accounts.map((item) =>
              item.id === account.id ? account : item,
            )
          : [...current.accounts, account],
      };
    });
    setSelectedAccountId(account.id);
    setIsCreating(false);
  }

  if (state.status !== "authenticated") return null;
  if (!canManage) return <PermissionDenied />;
  if (isLoading) return <AccountManagementPageSkeleton />;

  if (hasLoadError || !workspace) {
    return (
      <section className="mx-auto mt-10 max-w-md rounded-card border border-border bg-surface p-6 text-center shadow-card">
        <h1 className="text-2xl font-semibold text-text">
          Chưa tải được danh sách tài khoản
        </h1>
        <p className="mt-3 leading-7 text-text-muted">
          Kết nối có thể đang gián đoạn. Dữ liệu chưa bị thay đổi.
        </p>
        <Button className="mt-6" onClick={() => void loadWorkspace()}>
          Tải lại
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <ManagementHeading
        title="Tài khoản nội bộ"
        description="Quản lý đăng nhập, trạng thái truy cập và phân công vai trò theo vùng."
        icon="account"
      >
        <Button
          className="lg:w-auto"
          onClick={() => {
            setIsCreating(true);
            setSelectedAccountId(undefined);
            setIsEditorOpen(true);
          }}
        >
          <InterfaceIcon name="add" /> Thêm tài khoản
        </Button>
      </ManagementHeading>
      <ManagementSummary
        items={[
          {
            label: "Tài khoản nội bộ",
            value: workspace.accounts.filter(
              (account) => account.accountType === "internal",
            ).length,
            icon: "account",
          },
          {
            label: "Nội bộ đang hoạt động",
            value: workspace.accounts.filter(
              (account) =>
                account.accountType === "internal" &&
                account.status === "active",
            ).length,
            icon: "check",
          },
          {
            label: "Nội bộ đã khóa",
            value: workspace.accounts.filter(
              (account) =>
                account.accountType === "internal" &&
                account.status === "locked",
            ).length,
            icon: "lock",
          },
        ]}
      />

      <AccountList
        accounts={workspace.accounts}
        onSelect={openAccount}
        roles={workspace.roles}
        selectedAccountId={selectedAccountId}
        zones={workspace.zones}
      />

      <Dialog
        description={
          isCreating
            ? "Nhập thông tin nhân viên, chọn kênh gửi kích hoạt và kiểm tra quyền hiệu lực trước khi tạo tài khoản."
            : "Kiểm tra thông tin đăng nhập, trạng thái và quyền truy cập theo từng vùng."
        }
        onOpenChange={(open) => {
          if (!open && mutationPending.current) return;
          setIsEditorOpen(open);
        }}
        dismissible={!isMutating}
        open={isEditorOpen}
        size="xl"
        title={
          isCreating
            ? "Thêm tài khoản nội bộ"
            : (selectedAccount?.displayName ?? "Chi tiết tài khoản")
        }
      >
        {isEditorOpen && (isCreating || selectedAccount) && (
          <AccountEditor
            account={isCreating ? undefined : selectedAccount}
            embedded
            key={isCreating ? "create" : (selectedAccount?.id ?? "empty")}
            onDelivery={(receipt, kind) => {
              if (kind === "created") setIsEditorOpen(false);
              setDeliveryState({ kind, receipt });
            }}
            onOpenExisting={openAccount}
            onSaved={updateAccount}
            onPendingChange={updateMutationPending}
            workspace={workspace}
          />
        )}
      </Dialog>

      {deliveryState && (
        <CredentialDeliveryDialog
          kind={deliveryState.kind}
          onAcknowledge={() => setDeliveryState(undefined)}
          receipt={deliveryState.receipt}
        />
      )}
    </div>
  );
}
