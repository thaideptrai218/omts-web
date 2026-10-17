"use client";

import { useEffect, useState } from "react";
import { OneTimeCredentialDialog } from "@/components/security/one-time-credential-dialog";
import { Button } from "@/components/ui/button";
import { AccountEditor } from "@/features/account-management/components/account-editor";
import { AccountList } from "@/features/account-management/components/account-list";
import { AccountManagementPageSkeleton } from "@/features/account-management/components/account-management-page-skeleton";
import type {
  AccountManagementWorkspace,
  ManagedAccount,
  OneTimeTemporaryCredential,
} from "@/features/account-management/domain/account-management";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";
import { useAuth } from "@/features/auth/state/auth-provider";
import { accountManagementService } from "@/features/account-management/services/account-management-service.instance";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

type CredentialState = Readonly<{
  credential: OneTimeTemporaryCredential;
  kind: "created" | "reset";
}>;

function PermissionDenied() {
  return (
    <section className="mx-auto mt-10 max-w-lg rounded-card border border-border bg-surface p-6 text-center shadow-card sm:p-8">
      <div aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-full bg-warning-soft text-xl">⛔</div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-text">Không có quyền quản lý tài khoản</h1>
      <p className="mt-3 leading-7 text-text-muted">{formatMessage({ code: "MSG02" })}</p>
    </section>
  );
}

export function AccountManagementExperience() {
  const { state } = useAuth();
  const [workspace, setWorkspace] = useState<AccountManagementWorkspace>();
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [credentialState, setCredentialState] = useState<CredentialState>();
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
      setSelectedAccountId((current) =>
        result.workspace.accounts.some((account) => account.id === current)
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
    if (!canManage) return () => { isActive = false; };
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
        setSelectedAccountId(result.workspace.accounts[0]?.id);
      })
      .catch(() => { if (isActive) setHasLoadError(true); })
      .finally(() => { if (isActive) setIsLoading(false); });
    return () => { isActive = false; };
  }, [canManage]);

  function openAccount(accountId: string) {
    setSelectedAccountId(accountId);
    setIsCreating(false);
    requestAnimationFrame(() => document.getElementById("account-editor-start")?.focus());
  }

  function updateAccount(account: ManagedAccount) {
    setWorkspace((current) => {
      if (!current) return current;
      const exists = current.accounts.some((item) => item.id === account.id);
      return {
        ...current,
        accounts: exists
          ? current.accounts.map((item) => (item.id === account.id ? account : item))
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
        <h1 className="text-2xl font-semibold text-text">Chưa tải được danh sách tài khoản</h1>
        <p className="mt-3 leading-7 text-text-muted">Kết nối có thể đang gián đoạn. Dữ liệu chưa bị thay đổi.</p>
        <Button className="mt-6" onClick={() => void loadWorkspace()}>Tải lại</Button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Quản trị truy cập</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text sm:text-4xl">Tài khoản và vùng phụ trách</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-text-muted">
            Tạo tài khoản nội bộ, gán nhiều cặp vùng–vai trò và kiểm tra quyền thực tế trước khi xác nhận.
          </p>
        </div>
        <Button className="lg:w-auto" onClick={() => { setIsCreating(true); setSelectedAccountId(undefined); }}>
          Thêm tài khoản
        </Button>
      </header>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <AccountList
          accounts={workspace.accounts}
          onSelect={openAccount}
          selectedAccountId={selectedAccountId}
        />
        <div className="min-w-0 outline-none" id="account-editor-start" tabIndex={-1}>
          <AccountEditor
            account={isCreating ? undefined : selectedAccount}
            key={isCreating ? "create" : selectedAccount?.id ?? "empty"}
            onCredential={(credential, kind) => setCredentialState({ credential, kind })}
            onOpenExisting={openAccount}
            onSaved={updateAccount}
            workspace={workspace}
          />
        </div>
      </div>

      {credentialState && (
        <OneTimeCredentialDialog
          credential={credentialState.credential}
          description="Bàn giao trực tiếp cho người dùng. Sau khi đóng, mật khẩu sẽ không được hiển thị lại."
          onAcknowledge={() => setCredentialState(undefined)}
          title={credentialState.kind === "created" ? "Tài khoản đã được tạo" : "Mật khẩu đã được đặt lại"}
        />
      )}
    </div>
  );
}
