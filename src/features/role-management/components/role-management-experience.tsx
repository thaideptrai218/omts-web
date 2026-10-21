"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";
import { useAuth } from "@/features/auth/state/auth-provider";
import {
  RoleEditor,
  type RoleEditorMode,
} from "@/features/role-management/components/role-editor";
import { RoleList } from "@/features/role-management/components/role-list";
import { RoleManagementPageSkeleton } from "@/features/role-management/components/role-management-page-skeleton";
import type {
  RoleDetails,
  RoleWorkspace,
} from "@/features/role-management/domain/role-management";
import { roleManagementService } from "@/features/role-management/services/role-management-service.instance";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

function PermissionDenied() {
  return (
    <section className="mx-auto mt-10 max-w-lg rounded-card border border-border bg-surface p-6 text-center shadow-card sm:p-8">
      <div aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-full bg-warning-soft text-xl">
        ⛔
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-text">
        Không có quyền quản lý vai trò
      </h1>
      <p className="mt-3 leading-7 text-text-muted">{formatMessage({ code: "MSG02" })}</p>
    </section>
  );
}

export function RoleManagementExperience() {
  const { state } = useAuth();
  const [editorMode, setEditorMode] = useState<RoleEditorMode>("edit");
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string>();
  const [workspace, setWorkspace] = useState<RoleWorkspace>();
  const canManage =
    state.status === "authenticated" &&
    hasEffectivePermission(state.account.access, "access.roles.manage");
  const selectedRole = workspace?.roles.find((role) => role.id === selectedRoleId);

  async function loadWorkspace() {
    if (!canManage) return;
    setHasLoadError(false);
    setIsLoading(true);

    try {
      const result = await roleManagementService.load();
      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
        return;
      }
      if (result.status === "forbidden") {
        setHasLoadError(true);
        return;
      }

      setWorkspace(result.workspace);
      setSelectedRoleId((current) =>
        result.workspace.roles.some((role) => role.id === current)
          ? current
          : result.workspace.roles[0]?.id,
      );
      setEditorMode("edit");
    } catch {
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;
    if (!canManage) return () => { isActive = false; };

    roleManagementService
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
        setSelectedRoleId(result.workspace.roles[0]?.id);
      })
      .catch(() => {
        if (isActive) setHasLoadError(true);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => { isActive = false; };
  }, [canManage]);

  function openRole(roleId: string) {
    setSelectedRoleId(roleId);
    setEditorMode("edit");
    setIsEditorOpen(true);
  }

  function handleSaved(savedRole: RoleDetails) {
    setWorkspace((current) => {
      if (!current) return current;
      const exists = current.roles.some((role) => role.id === savedRole.id);
      return {
        ...current,
        roles: exists
          ? current.roles.map((role) => (role.id === savedRole.id ? savedRole : role))
          : [...current.roles, savedRole],
      };
    });
    setSelectedRoleId(savedRole.id);
    setEditorMode("edit");
    setIsEditorOpen(false);
  }

  if (state.status !== "authenticated") return null;
  if (!canManage) return <PermissionDenied />;
  if (isLoading) return <RoleManagementPageSkeleton />;

  if (hasLoadError || !workspace) {
    return (
      <section className="mx-auto mt-10 max-w-md rounded-card border border-border bg-surface p-6 text-center shadow-card">
        <h1 className="text-2xl font-semibold text-text">Chưa tải được danh sách vai trò</h1>
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
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            Vai trò và quyền hạn
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-text-muted">
            Thiết lập quyền theo chức năng và phạm vi dữ liệu. Thay đổi ở vai trò đang dùng sẽ áp dụng ngay cho các tài khoản liên quan sau khi xác nhận.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            className="sm:w-auto"
            disabled={!selectedRole}
            onClick={() => {
              setEditorMode("copy");
              setIsEditorOpen(true);
            }}
            variant="secondary"
          >
            Sao chép vai trò
          </Button>
          <Button
            className="sm:w-auto"
            onClick={() => {
              setSelectedRoleId(undefined);
              setEditorMode("create");
              setIsEditorOpen(true);
            }}
          >
            Thêm vai trò
          </Button>
        </div>
      </header>

      <RoleList
        onSelect={openRole}
        roles={workspace.roles}
        selectedRoleId={selectedRoleId}
      />

      <Dialog
        description="Thiết lập quyền theo chức năng và phạm vi dữ liệu. Các thay đổi với vai trò đang dùng cần được xác nhận trước khi áp dụng."
        onOpenChange={setIsEditorOpen}
        open={isEditorOpen}
        size="xl"
        title={
          editorMode === "create"
            ? "Thêm vai trò"
            : editorMode === "copy"
              ? `Sao chép ${selectedRole?.name ?? "vai trò"}`
              : selectedRole?.name ?? "Chi tiết vai trò"
        }
      >
        {isEditorOpen && (editorMode === "create" || selectedRole) && (
          <RoleEditor
            catalog={workspace.catalog}
            embedded
            key={`${editorMode}-${selectedRole?.id ?? "new"}-${selectedRole?.recordVersion ?? "draft"}`}
            mode={editorMode}
            onOpenExisting={openRole}
            onReload={() => void loadWorkspace()}
            onSaved={handleSaved}
            role={selectedRole}
          />
        )}
      </Dialog>
    </div>
  );
}
