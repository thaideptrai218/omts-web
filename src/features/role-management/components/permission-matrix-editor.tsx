"use client";

import { useState } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import type {
  FeatureCatalogItem,
  RolePermission,
} from "../domain/role-management";
import {
  createEmptyPermission,
  isViewLocked,
  setPermissionScope,
  togglePermissionAction,
} from "../lib/role-permission-rules";

type Props = Readonly<{
  catalog: readonly FeatureCatalogItem[];
  disabled?: boolean;
  errors?: Readonly<Record<string, string>>;
  onChange(permissions: readonly RolePermission[]): void;
  permissions: readonly RolePermission[];
}>;

export function PermissionMatrixEditor({
  catalog,
  disabled = false,
  errors = {},
  onChange,
  permissions,
}: Props) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const groups = [...new Set(catalog.map((feature) => feature.groupLabel))];
  // Always show invalid rows, even when the current filter would hide them.
  const visible = catalog.filter(
    (feature) =>
      errors[feature.code] ||
      ((group === "all" || group === feature.groupLabel) &&
        [feature.label, feature.description ?? ""].some((value) =>
          value.toLocaleLowerCase("vi").includes(normalizedQuery),
        )),
  );

  function update(updated: RolePermission) {
    onChange(
      permissions.some(
        (permission) => permission.featureCode === updated.featureCode,
      )
        ? permissions.map((permission) =>
            permission.featureCode === updated.featureCode
              ? updated
              : permission,
          )
        : [...permissions, updated],
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-control bg-surface-subtle p-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="min-w-0">
          <label
            htmlFor="permission-search"
            className="text-sm font-medium text-text"
          >
            Tìm chức năng
          </label>
          <input
            id="permission-search"
            type="search"
            placeholder="Ví dụ: bè nuôi, phiếu thu"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-control border border-border bg-surface px-3 text-sm text-text"
          />
        </div>
        <div className="min-w-0">
          <label
            htmlFor="permission-group"
            className="text-sm font-medium text-text"
          >
            Nhóm chức năng
          </label>
          <select
            id="permission-group"
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-control border border-border bg-surface px-3 text-sm text-text"
          >
            <option value="all">Tất cả nhóm</option>
            {groups.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs leading-5 text-text-muted">
        {visible.length} / {catalog.length} chức năng. Mở từng mục để điều
        chỉnh; lọc danh sách không thay đổi quyền đã chọn.
      </p>
      {visible.length === 0 && (
        <p className="rounded-control border border-dashed border-border p-5 text-sm text-text-muted">
          Không có chức năng phù hợp. Hãy thử từ khóa hoặc nhóm khác.
        </p>
      )}
      <div className="grid items-start gap-3 lg:grid-cols-2">
        {visible.map((feature) => {
          const permission =
            permissions.find((item) => item.featureCode === feature.code) ??
            createEmptyPermission(feature.code);
          const viewLocked = isViewLocked(permission, feature);
          return (
            <details
              key={feature.code}
              data-permission-feature={feature.code}
              tabIndex={-1}
              open={errors[feature.code] ? true : undefined}
              className={`group min-w-0 rounded-card border bg-surface ${errors[feature.code] ? "border-danger" : "border-border"}`}
            >
              <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-3 p-4">
                <span className="min-w-0">
                  <span className="block font-semibold text-text">
                    {feature.label}
                  </span>
                  <span className="mt-1 block text-xs text-text-muted">
                    {feature.groupLabel} — {permission.actionKeys.length} quyền
                    đã chọn
                  </span>
                </span>
                <InterfaceIcon
                  name="add"
                  className="size-5 shrink-0 text-primary transition-transform motion-safe:group-open:rotate-45"
                />
              </summary>
              <div className="space-y-4 border-t border-border p-4">
                {feature.description && (
                  <p className="text-sm leading-6 text-text-muted">
                    {feature.description}
                  </p>
                )}
                <fieldset>
                  <legend className="sr-only">Quyền cho {feature.label}</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {feature.supportedActions.map((action) => {
                      const locked = action.category === "view" && viewLocked;
                      return (
                        <label
                          key={action.key}
                          className="flex min-h-11 items-center gap-3 rounded-control bg-surface-subtle px-3 py-2 text-sm text-text"
                        >
                          <input
                            type="checkbox"
                            aria-label={`${action.label} cho ${feature.label}`}
                            checked={permission.actionKeys.includes(action.key)}
                            disabled={disabled || locked}
                            className="size-5 shrink-0 accent-primary"
                            onChange={(event) => {
                              const next = togglePermissionAction(
                                permission,
                                feature,
                                action.key,
                                event.target.checked,
                              );
                              update(
                                next.actionKeys.length
                                  ? next
                                  : { ...next, dataScopeId: null },
                              );
                            }}
                          />
                          <span>{action.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                {feature.scope && (
                  <div>
                    <label
                      htmlFor={`scope-${feature.code}`}
                      className="text-sm font-medium text-text"
                    >
                      Phạm vi dữ liệu
                    </label>
                    <select
                      id={`scope-${feature.code}`}
                      aria-label={`Phạm vi dữ liệu của ${feature.label}`}
                      value={permission.dataScopeId ?? ""}
                      disabled={disabled || !permission.actionKeys.length}
                      onChange={(event) =>
                        update(
                          setPermissionScope(
                            permission,
                            feature,
                            event.target.value || null,
                          ),
                        )
                      }
                      className="mt-2 min-h-11 w-full rounded-control border border-border bg-surface px-3 text-sm text-text"
                    >
                      <option value="">Chọn phạm vi</option>
                      {feature.scope.options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {viewLocked && (
                  <p className="text-xs leading-5 text-info">
                    Quyền Xem được giữ khi đang có quyền thao tác khác.
                  </p>
                )}
                {errors[feature.code] && (
                  <p role="alert" className="text-sm font-medium text-danger">
                    {errors[feature.code]}
                  </p>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
