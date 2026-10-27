"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  ManagementHeading,
  ManagementSummary,
} from "@/components/ui/management-page";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";
import { useAuth } from "@/features/auth/state/auth-provider";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";
import { RoleEditor } from "./role-editor";
import { RoleList } from "./role-list";
import { RoleManagementPageSkeleton } from "./role-management-page-skeleton";
import type { RoleDetails, RoleWorkspace } from "../domain/role-management";
import { roleManagementService } from "../services/role-management-service.instance";

export function RoleManagementExperience() {
  const { state } = useAuth();
  const [workspace, setWorkspace] = useState<RoleWorkspace>();
  const [selectedRoleId, setSelectedRoleId] = useState<string>();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reload, setReload] = useState(0);
  const canManage =
    state.status === "authenticated" &&
    hasEffectivePermission(state.account.access, "access.roles.manage");
  const selectedRole = workspace?.roles.find(
    (role) => role.id === selectedRoleId,
  );

  useEffect(() => {
    let active = true;
    if (!canManage) return;
    roleManagementService
      .load()
      .then((result) => {
        if (!active) return;
        if (result.status === "session-expired") {
          sessionExpiryChannel.publish(result.message);
          return;
        }
        if (result.status === "forbidden") {
          setHasError(true);
          return;
        }
        setWorkspace(result.workspace);
        setHasError(false);
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canManage, reload]);

  function reloadWorkspace() {
    setLoading(true);
    setReload((value) => value + 1);
  }
  function openRole(id: string) {
    setSelectedRoleId(id);
    setOpen(true);
  }
  function saved(role: RoleDetails) {
    setWorkspace((current) =>
      current
        ? {
            ...current,
            roles: current.roles.map((item) =>
              item.id === role.id ? role : item,
            ),
          }
        : current,
    );
    setOpen(false);
  }

  if (state.status !== "authenticated") return null;
  if (!canManage)
    return (
      <section className="rounded-card border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold">
          Không có quyền quản lý vai trò
        </h1>
        <p className="mt-3 text-text-muted">
          {formatMessage({ code: "MSG02" })}
        </p>
      </section>
    );

  return (
    <div className="space-y-6">
      <ManagementHeading
        title="Vai trò & quyền"
        description="Ba vai trò cố định của hợp tác xã. Chọn một vai trò để xem và điều chỉnh quyền theo chức năng."
        icon="roles"
      />
      {loading ? (
        <RoleManagementPageSkeleton />
      ) : hasError || !workspace ? (
        <div
          role="alert"
          className="rounded-card border border-border bg-surface p-6"
        >
          <h2 className="font-semibold">Chưa tải được danh sách vai trò</h2>
          <Button
            className="mt-4 sm:w-auto"
            variant="secondary"
            onClick={reloadWorkspace}
          >
            Tải lại
          </Button>
        </div>
      ) : (
        <>
          <ManagementSummary
            items={[
              {
                label: "Vai trò cố định",
                value: workspace.roles.length,
                icon: "roles",
              },
              {
                label: "Đang sử dụng",
                value: workspace.roles.filter(
                  (role) => role.status === "in-use",
                ).length,
                icon: "check",
              },
              {
                label: "Đã ngừng sử dụng",
                value: workspace.roles.filter(
                  (role) => role.status === "discontinued",
                ).length,
                icon: "lock",
              },
            ]}
          />
          <RoleList
            roles={workspace.roles}
            selectedRoleId={selectedRoleId}
            onSelect={openRole}
          />
        </>
      )}
      <Dialog
        title={selectedRole?.name ?? "Chi tiết vai trò"}
        description="Điều chỉnh quyền và phạm vi dữ liệu. Thay đổi vai trò đang được sử dụng cần xác nhận các tài khoản bị ảnh hưởng."
        size="xl"
        open={open && Boolean(selectedRole)}
        dismissible={!pending}
        onOpenChange={setOpen}
      >
        {open && selectedRole && workspace && (
          <RoleEditor
            key={`${selectedRole.id}-${selectedRole.recordVersion}`}
            catalog={workspace.catalog}
            embedded
            fixedName
            mode="edit"
            onOpenExisting={openRole}
            onReload={reloadWorkspace}
            onSaved={saved}
            onPendingChange={setPending}
            role={selectedRole}
          />
        )}
      </Dialog>
    </div>
  );
}
