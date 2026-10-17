"use client";

import type {
  FeatureCatalogItem,
  PermissionAction,
  RolePermission,
} from "@/features/role-management/domain/role-management";
import {
  createEmptyPermission,
  isViewLocked,
  setPermissionScope,
  togglePermissionAction,
} from "@/features/role-management/lib/role-permission-rules";

type PermissionMatrixEditorProps = Readonly<{
  catalog: readonly FeatureCatalogItem[];
  disabled?: boolean;
  errors?: Readonly<Record<string, string>>;
  onChange(permissions: readonly RolePermission[]): void;
  permissions: readonly RolePermission[];
}>;

const standardCategories = ["create", "view", "edit", "delete"] as const;

function permissionFor(
  featureCode: string,
  permissions: readonly RolePermission[],
): RolePermission {
  return (
    permissions.find((permission) => permission.featureCode === featureCode) ??
    createEmptyPermission(featureCode)
  );
}

function actionFor(
  feature: FeatureCatalogItem,
  category: (typeof standardCategories)[number],
): PermissionAction | undefined {
  return feature.supportedActions.find((action) => action.category === category);
}

function ActionCheckbox({
  action,
  checked,
  disabled,
  feature,
  locked,
  onChange,
  showLabel = true,
}: Readonly<{
  action?: PermissionAction;
  checked: boolean;
  disabled: boolean;
  feature: FeatureCatalogItem;
  locked: boolean;
  onChange(checked: boolean): void;
  showLabel?: boolean;
}>) {
  if (!action) {
    return (
      <span className="text-sm text-text-subtle" title="Chức năng không hỗ trợ quyền này">
        Không áp dụng
      </span>
    );
  }

  const isDisabled = disabled || locked;

  return (
    <label
      className={`inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-sm font-medium ${
        isDisabled ? "cursor-not-allowed text-text-muted" : "cursor-pointer text-text"
      }`}
      title={locked ? "Quyền này cần được giữ vì đang có quyền thao tác khác." : undefined}
    >
      <input
        checked={checked}
        className="size-5 shrink-0 accent-[var(--color-primary)]"
        disabled={isDisabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {showLabel && <span>{action.label}</span>}
      <span className="sr-only">cho {feature.label}</span>
    </label>
  );
}

function ScopeSelect({
  disabled,
  feature,
  onChange,
  permission,
}: Readonly<{
  disabled: boolean;
  feature: FeatureCatalogItem;
  onChange(value: string | null): void;
  permission: RolePermission;
}>) {
  if (!feature.scope) {
    return <span className="text-sm text-text-subtle">Không áp dụng</span>;
  }

  return (
    <select
      aria-label={`Phạm vi dữ liệu của ${feature.label}`}
      className="min-h-11 w-full min-w-0 rounded-control border border-border-strong bg-surface px-3 text-sm text-text outline-none focus-visible:border-primary"
      disabled={disabled || permission.actionKeys.length === 0}
      onChange={(event) => onChange(event.target.value || null)}
      value={permission.dataScopeId ?? ""}
    >
      <option value="">Chọn phạm vi</option>
      {feature.scope.options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function FeaturePermissionControls({
  disabled,
  feature,
  onChange,
  permission,
}: Readonly<{
  disabled: boolean;
  feature: FeatureCatalogItem;
  onChange(permission: RolePermission): void;
  permission: RolePermission;
}>) {
  const otherActions = feature.supportedActions.filter(
    (action) => action.category === "other",
  );
  const viewLocked = isViewLocked(permission, feature);

  function toggle(action: PermissionAction, checked: boolean) {
    const updated = togglePermissionAction(permission, feature, action.key, checked);
    onChange(
      updated.actionKeys.length === 0 ? { ...updated, dataScopeId: null } : updated,
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {standardCategories.map((category) => {
          const action = actionFor(feature, category);
          return (
            <ActionCheckbox
              action={action}
              checked={Boolean(action && permission.actionKeys.includes(action.key))}
              disabled={disabled}
              feature={feature}
              key={category}
              locked={category === "view" && viewLocked}
              onChange={(checked) => action && toggle(action, checked)}
            />
          );
        })}
      </div>

      {otherActions.length > 0 && (
        <fieldset>
          <legend className="text-sm font-semibold text-text">Quyền khác</legend>
          <div className="mt-1 flex flex-wrap gap-1">
            {otherActions.map((action) => (
              <ActionCheckbox
                action={action}
                checked={permission.actionKeys.includes(action.key)}
                disabled={disabled}
                feature={feature}
                key={action.key}
                locked={false}
                onChange={(checked) => toggle(action, checked)}
              />
            ))}
          </div>
        </fieldset>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold text-text">Phạm vi dữ liệu</p>
        <ScopeSelect
          disabled={disabled}
          feature={feature}
          onChange={(value) =>
            onChange(setPermissionScope(permission, feature, value))
          }
          permission={permission}
        />
      </div>

      {viewLocked && (
        <p className="text-sm leading-6 text-info">
          Quyền Xem được giữ vì chức năng đang có quyền thao tác khác.
        </p>
      )}
    </div>
  );
}

export function PermissionMatrixEditor({
  catalog,
  disabled = false,
  errors = {},
  onChange,
  permissions,
}: PermissionMatrixEditorProps) {
  function updatePermission(updated: RolePermission) {
    const exists = permissions.some(
      (permission) => permission.featureCode === updated.featureCode,
    );
    onChange(
      exists
        ? permissions.map((permission) =>
            permission.featureCode === updated.featureCode ? updated : permission,
          )
        : [...permissions, updated],
    );
  }

  return (
    <div>
      <div className="space-y-3 2xl:hidden">
        {catalog.map((feature) => {
          const permission = permissionFor(feature.code, permissions);
          return (
            <details
              className="group min-w-0 rounded-card border border-border bg-surface-subtle open:bg-surface"
              data-permission-feature={feature.code}
              key={feature.code}
              tabIndex={-1}
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <span className="min-w-0">
                  <span className="block font-semibold text-text">{feature.label}</span>
                  <span className="mt-0.5 block text-sm text-text-muted">
                    {permission.actionKeys.length} quyền đã chọn
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-xl text-text-muted transition group-open:rotate-180"
                >
                  ⌄
                </span>
              </summary>
              <div className="border-t border-border px-4 py-4">
                {feature.description && (
                  <p className="mb-3 text-sm leading-6 text-text-muted">
                    {feature.description}
                  </p>
                )}
                <FeaturePermissionControls
                  disabled={disabled}
                  feature={feature}
                  onChange={updatePermission}
                  permission={permission}
                />
                {errors[feature.code] && (
                  <p className="mt-3 text-sm font-medium text-danger" role="alert">
                    {errors[feature.code]}
                  </p>
                )}
              </div>
            </details>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-card border border-border 2xl:block">
        <table className="w-full min-w-[52rem] border-collapse text-left">
          <thead className="sticky top-16 z-10 bg-surface-subtle text-sm text-text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold" scope="col">Chức năng</th>
              {standardCategories.map((category) => (
                <th className="px-2 py-3 text-center font-semibold" key={category} scope="col">
                  {category === "create"
                    ? "Tạo"
                    : category === "view"
                      ? "Xem"
                      : category === "edit"
                        ? "Sửa"
                        : "Xóa"}
                </th>
              ))}
              <th className="px-3 py-3 font-semibold" scope="col">Quyền khác</th>
              <th className="px-4 py-3 font-semibold" scope="col">Phạm vi dữ liệu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {catalog.map((feature) => {
              const permission = permissionFor(feature.code, permissions);
              const viewLocked = isViewLocked(permission, feature);
              const otherActions = feature.supportedActions.filter(
                (action) => action.category === "other",
              );

              return (
                <tr data-permission-feature={feature.code} key={feature.code} tabIndex={-1}>
                  <th className="w-56 px-4 py-4 align-top" scope="row">
                    <span className="block font-semibold text-text">{feature.label}</span>
                    <span className="mt-1 block text-xs font-normal text-text-muted">
                      {feature.groupLabel}
                    </span>
                    {errors[feature.code] && (
                      <span className="mt-2 block text-xs font-medium text-danger" role="alert">
                        {errors[feature.code]}
                      </span>
                    )}
                  </th>
                  {standardCategories.map((category) => {
                    const action = actionFor(feature, category);
                    return (
                      <td className="px-2 py-4 text-center align-top" key={category}>
                        <ActionCheckbox
                          action={action}
                          checked={Boolean(
                            action && permission.actionKeys.includes(action.key),
                          )}
                          disabled={disabled}
                          feature={feature}
                          locked={category === "view" && viewLocked}
                          onChange={(checked) => {
                            if (!action) return;
                            const updated = togglePermissionAction(
                              permission,
                              feature,
                              action.key,
                              checked,
                            );
                            updatePermission(
                              updated.actionKeys.length === 0
                                ? { ...updated, dataScopeId: null }
                                : updated,
                            );
                          }}
                          showLabel={false}
                        />
                      </td>
                    );
                  })}
                  <td className="max-w-48 px-3 py-4 align-top">
                    {otherActions.length > 0 ? (
                      <div className="space-y-1">
                        {otherActions.map((action) => (
                          <ActionCheckbox
                            action={action}
                            checked={permission.actionKeys.includes(action.key)}
                            disabled={disabled}
                            feature={feature}
                            key={action.key}
                            locked={false}
                            onChange={(checked) => {
                              const updated = togglePermissionAction(
                                permission,
                                feature,
                                action.key,
                                checked,
                              );
                              updatePermission(
                                updated.actionKeys.length === 0
                                  ? { ...updated, dataScopeId: null }
                                  : updated,
                              );
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-text-subtle">Không áp dụng</span>
                    )}
                  </td>
                  <td className="w-56 px-4 py-4 align-top">
                    <ScopeSelect
                      disabled={disabled}
                      feature={feature}
                      onChange={(value) =>
                        updatePermission(setPermissionScope(permission, feature, value))
                      }
                      permission={permission}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
