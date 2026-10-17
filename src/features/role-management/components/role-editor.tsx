"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import { PermissionMatrixEditor } from "@/features/role-management/components/permission-matrix-editor";
import type {
  FeatureCatalogItem,
  RoleDetails,
  RoleImpactAccount,
  RolePermission,
  SaveRoleInput,
} from "@/features/role-management/domain/role-management";
import {
  createEmptyPermission,
  validatePermissionMatrix,
} from "@/features/role-management/lib/role-permission-rules";
import { roleEditorSchema } from "@/features/role-management/schemas/role-editor-schema";
import { roleManagementService } from "@/features/role-management/services/role-management-service.instance";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

export type RoleEditorMode = "copy" | "create" | "edit";

type RoleEditorProps = Readonly<{
  catalog: readonly FeatureCatalogItem[];
  mode: RoleEditorMode;
  onOpenExisting(roleId: string): void;
  onReload(): void;
  onSaved(role: RoleDetails): void;
  role?: RoleDetails;
}>;

type EditorAlert = Readonly<{
  message: string;
  tone: "danger" | "warning";
}>;

function createInitialPermissions(
  catalog: readonly FeatureCatalogItem[],
  source?: RoleDetails,
): readonly RolePermission[] {
  return catalog.map((feature) => {
    const permission = source?.permissions.find(
      (item) => item.featureCode === feature.code,
    );
    return permission
      ? { ...permission, actionKeys: [...permission.actionKeys] }
      : createEmptyPermission(feature.code);
  });
}

function roleStatusLabel(role?: RoleDetails): string {
  if (!role) return "Vai trò mới";
  return role.status === "in-use" ? "Đang sử dụng" : "Đã ngừng dùng";
}

function ImpactAccountList({ accounts }: { accounts: readonly RoleImpactAccount[] }) {
  return (
    <ul className="max-h-60 space-y-2 overflow-y-auto" aria-label="Tài khoản bị ảnh hưởng">
      {accounts.map((account) => (
        <li
          className="rounded-control border border-border bg-surface-subtle p-3"
          key={account.accountId}
        >
          <p className="font-semibold text-text">{account.displayName}</p>
          <p className="mt-1 text-sm text-text-muted">@{account.username}</p>
          <p className="mt-1 text-sm leading-6 text-text-muted">
            {account.zoneLabels.join(", ")}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function RoleEditor({
  catalog,
  mode,
  onOpenExisting,
  onReload,
  onSaved,
  role,
}: RoleEditorProps) {
  const { notify } = useToast();
  const initialPermissions = useMemo(
    () => createInitialPermissions(catalog, role),
    [catalog, role],
  );
  const initialName = mode === "copy" && role ? `Bản sao của ${role.name}` : role?.name ?? "";
  const initialDescription = role?.description ?? "";
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [alert, setAlert] = useState<EditorAlert>();
  const [description, setDescription] = useState(initialDescription);
  const [duplicateRoleId, setDuplicateRoleId] = useState<string>();
  const [impactAccounts, setImpactAccounts] = useState<readonly RoleImpactAccount[]>([]);
  const [isDiscontinueDialogOpen, setIsDiscontinueDialogOpen] = useState(false);
  const [isImpactDialogOpen, setIsImpactDialogOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState(initialName);
  const [nameError, setNameError] = useState<string>();
  const [permissionErrors, setPermissionErrors] = useState<Record<string, string>>({});
  const [permissions, setPermissions] = useState(initialPermissions);
  const isExistingRole = mode === "edit" && Boolean(role);
  const isReadOnly = isExistingRole && role?.status === "discontinued";
  const hasChanges =
    mode !== "edit" ||
    name !== initialName ||
    description !== initialDescription ||
    JSON.stringify(permissions) !== JSON.stringify(initialPermissions);

  function resetDraft() {
    setName(initialName);
    setDescription(initialDescription);
    setPermissions(initialPermissions);
    setNameError(undefined);
    setPermissionErrors({});
    setAlert(undefined);
    setDuplicateRoleId(undefined);
  }

  function createSaveInput(confirmImpact: boolean): SaveRoleInput {
    return {
      confirmImpact,
      description,
      id: isExistingRole ? role?.id ?? null : null,
      name,
      permissions,
      recordVersion: isExistingRole ? role?.recordVersion ?? null : null,
    };
  }

  function validateDraft(): boolean {
    const metadata = roleEditorSchema.safeParse({ description, name });
    const matrixErrors = validatePermissionMatrix(permissions, catalog);
    const nextPermissionErrors = Object.fromEntries(
      matrixErrors.map((error) => [error.featureCode, error.message]),
    );

    setPermissionErrors(nextPermissionErrors);
    if (!metadata.success) {
      setNameError(metadata.error.issues[0]?.message ?? formatMessage({ code: "MSG01" }));
      nameInputRef.current?.focus();
      return false;
    }

    setNameError(undefined);
    if (matrixErrors.length > 0) {
      const featureCode = matrixErrors[0]?.featureCode;
      requestAnimationFrame(() => {
        const candidates = document.querySelectorAll<HTMLElement>(
          `[data-permission-feature="${featureCode}"]`,
        );
        Array.from(candidates).find((candidate) => candidate.offsetParent !== null)?.focus();
      });
      return false;
    }

    return true;
  }

  async function save(confirmImpact: boolean) {
    if (isPending || isReadOnly || !validateDraft()) return;

    setAlert(undefined);
    setDuplicateRoleId(undefined);
    setIsPending(true);

    try {
      const result = await roleManagementService.save(createSaveInput(confirmImpact));

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

  return (
    <section className="min-w-0 rounded-card border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-semibold text-primary">
            {mode === "create" ? "Tạo vai trò" : mode === "copy" ? "Sao chép vai trò" : "Chi tiết vai trò"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text">
            {mode === "create" ? "Vai trò mới" : role?.name ?? "Vai trò"}
          </h2>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1.5 text-sm font-semibold ${
            role?.status === "discontinued"
              ? "bg-surface-subtle text-text-muted"
              : "bg-emerald-50 text-success"
          }`}
        >
          {roleStatusLabel(isExistingRole ? role : undefined)}
        </span>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {isReadOnly && (
          <div className="rounded-control border border-border bg-surface-subtle p-4 text-sm leading-6 text-text-muted">
            Vai trò này đã ngừng dùng nên chỉ có thể xem hoặc sao chép. OMTS không xóa vai trò để giữ lịch sử cấp quyền.
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-text" htmlFor="role-name">
              Tên vai trò<span aria-hidden="true" className="ml-1 text-danger">*</span>
            </label>
            <input
              aria-describedby={nameError ? "role-name-error" : undefined}
              aria-invalid={nameError ? true : undefined}
              className={`mt-2 min-h-12 w-full rounded-control border bg-surface px-3.5 text-base text-text outline-none transition ${
                nameError
                  ? "border-danger focus-visible:border-danger"
                  : "border-border-strong focus-visible:border-primary"
              }`}
              disabled={isReadOnly || isPending}
              id="role-name"
              maxLength={100}
              onChange={(event) => {
                setName(event.target.value);
                setNameError(undefined);
              }}
              ref={nameInputRef}
              required
              value={name}
            />
            {nameError && (
              <p className="mt-1.5 text-sm font-medium text-danger" id="role-name-error" role="alert">
                {nameError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-text" htmlFor="role-description">
              Mô tả
            </label>
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-control border border-border-strong bg-surface px-3.5 py-3 text-base text-text outline-none focus-visible:border-primary"
              disabled={isReadOnly || isPending}
              id="role-description"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </div>
        </div>

        {isExistingRole && role && role.activeAccountCount > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-control border border-info/20 bg-info-soft p-4 text-sm text-info">
            <span><strong>{role.activeAccountCount}</strong> tài khoản đang giữ vai trò</span>
            <span><strong>{role.activeZoneCount}</strong> khu vực bị ảnh hưởng</span>
          </div>
        )}

        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-text">Ma trận quyền</h3>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Chọn quyền theo từng chức năng. Khi có quyền thao tác, quyền Xem được bật và giữ tự động.
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
          <div
            className={`rounded-control border p-4 text-sm leading-6 ${
              alert.tone === "danger"
                ? "border-danger/30 bg-danger/10 text-danger"
                : "border-warning/30 bg-warning-soft text-warning"
            }`}
            role="alert"
          >
            <p>{alert.message}</p>
            {duplicateRoleId && (
              <button
                className="mt-2 min-h-11 rounded-control px-2 font-semibold underline underline-offset-4"
                onClick={() => onOpenExisting(duplicateRoleId)}
                type="button"
              >
                Mở vai trò đã có
              </button>
            )}
            {alert.tone === "warning" && (
              <button
                className="mt-2 min-h-11 rounded-control px-2 font-semibold underline underline-offset-4"
                onClick={onReload}
                type="button"
              >
                Tải dữ liệu mới nhất
              </button>
            )}
            {impactAccounts.length > 0 && alert.tone === "danger" && (
              <div className="mt-3 text-text">
                <ImpactAccountList accounts={impactAccounts} />
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {isExistingRole && role?.status === "in-use" && (
              <Button
                className="sm:w-auto"
                disabled={isPending}
                onClick={() => setIsDiscontinueDialogOpen(true)}
                variant="danger"
              >
                Ngừng sử dụng
              </Button>
            )}
          </div>
          {!isReadOnly && (
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                className="sm:w-auto"
                disabled={!hasChanges || isPending}
                onClick={resetDraft}
                variant="secondary"
              >
                Hủy thay đổi
              </Button>
              <Button
                className="sm:w-auto sm:min-w-40"
                disabled={isExistingRole && !hasChanges}
                isPending={isPending}
                onClick={() => void save(false)}
                pendingLabel="Đang lưu..."
              >
                Lưu vai trò
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog
        description="Quyền mới sẽ áp dụng ngay cho mọi tài khoản đang giữ vai trò này. Hãy kiểm tra danh sách trước khi xác nhận."
        dismissible={!isPending}
        onOpenChange={setIsImpactDialogOpen}
        open={isImpactDialogOpen}
        title="Xác nhận ảnh hưởng quyền truy cập"
      >
        <ImpactAccountList accounts={impactAccounts} />
        <p className="mt-4 rounded-control border border-warning/30 bg-warning-soft p-3 text-sm leading-6 text-warning">
          {formatMessage({
            code: "MSG09",
            params: { action: `cập nhật vai trò ${role?.name ?? name}` },
          })}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            className="sm:w-auto"
            data-dialog-initial-focus
            disabled={isPending}
            onClick={() => setIsImpactDialogOpen(false)}
            variant="secondary"
          >
            Kiểm tra lại
          </Button>
          <Button
            className="sm:w-auto"
            isPending={isPending}
            onClick={() => void save(true)}
            pendingLabel="Đang áp dụng..."
          >
            Xác nhận và áp dụng
          </Button>
        </div>
      </Dialog>

      <ConfirmDialog
        confirmLabel="Ngừng sử dụng"
        description="Vai trò sẽ không còn xuất hiện khi cấp quyền mới. Nếu còn tài khoản đang giữ vai trò, hệ thống sẽ chặn thao tác và chỉ ra các tài khoản cần xử lý."
        isPending={isPending}
        onConfirm={() => void discontinueRole()}
        onOpenChange={setIsDiscontinueDialogOpen}
        open={isDiscontinueDialogOpen}
        title={`Ngừng sử dụng vai trò ${role?.name ?? ""}?`}
        tone="danger"
      />
    </section>
  );
}
