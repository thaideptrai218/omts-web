import type {
  FeatureCatalogItem,
  RolePermission,
} from "@/features/role-management/domain/role-management";

export type PermissionValidationError = Readonly<{
  featureCode: string;
  message: string;
}>;

function viewActionKey(feature: FeatureCatalogItem): string | undefined {
  return feature.supportedActions.find((action) => action.category === "view")?.key;
}

export function createEmptyPermission(featureCode: string): RolePermission {
  return { actionKeys: [], dataScopeId: null, featureCode };
}

export function isViewLocked(
  permission: RolePermission,
  feature: FeatureCatalogItem,
): boolean {
  const viewKey = viewActionKey(feature);
  return feature.supportedActions.some(
    (action) =>
      action.key !== viewKey && permission.actionKeys.includes(action.key),
  );
}

export function togglePermissionAction(
  permission: RolePermission,
  feature: FeatureCatalogItem,
  actionKey: string,
  checked: boolean,
): RolePermission {
  const action = feature.supportedActions.find((item) => item.key === actionKey);
  if (!action) return permission;

  const currentKeys = new Set(permission.actionKeys);
  const viewKey = viewActionKey(feature);

  if (checked) {
    currentKeys.add(actionKey);
    if (action.category !== "view" && viewKey) currentKeys.add(viewKey);
  } else {
    if (action.category === "view" && isViewLocked(permission, feature)) {
      return permission;
    }
    currentKeys.delete(actionKey);
  }

  return { ...permission, actionKeys: [...currentKeys] };
}

export function setPermissionScope(
  permission: RolePermission,
  feature: FeatureCatalogItem,
  dataScopeId: string | null,
): RolePermission {
  if (!feature.scope) return { ...permission, dataScopeId: null };

  const isSupported = feature.scope.options.some(
    (option) => option.id === dataScopeId,
  );

  return {
    ...permission,
    dataScopeId: isSupported ? dataScopeId : null,
  };
}

export function validatePermissionMatrix(
  permissions: readonly RolePermission[],
  catalog: readonly FeatureCatalogItem[],
): readonly PermissionValidationError[] {
  const catalogCodes = new Set(catalog.map((feature) => feature.code));
  const permissionsByFeature = new Map(
    permissions.map((permission) => [permission.featureCode, permission]),
  );

  if (permissionsByFeature.size !== permissions.length) {
    return [
      {
        featureCode: permissions.find(
          (permission, index) =>
            permissions.findIndex(
              (candidate) => candidate.featureCode === permission.featureCode,
            ) !== index,
        )?.featureCode ?? "unknown",
        message: "Mỗi chức năng chỉ được có một dòng quyền.",
      },
    ];
  }

  const unknownPermission = permissions.find(
    (permission) => !catalogCodes.has(permission.featureCode),
  );
  if (unknownPermission) {
    return [
      {
        featureCode: unknownPermission.featureCode,
        message: "Chức năng không tồn tại trong danh mục hiện tại.",
      },
    ];
  }

  return catalog.flatMap((feature) => {
    const permission = permissionsByFeature.get(feature.code);
    if (!permission) {
      return [{ featureCode: feature.code, message: "Thiếu dòng quyền của chức năng." }];
    }

    const supportedKeys = new Set(
      feature.supportedActions.map((action) => action.key),
    );
    const hasUnsupportedAction = permission.actionKeys.some(
      (key) => !supportedKeys.has(key),
    );
    if (hasUnsupportedAction) {
      return [{ featureCode: feature.code, message: "Có quyền không được chức năng hỗ trợ." }];
    }

    const viewKey = viewActionKey(feature);
    if (isViewLocked(permission, feature) && (!viewKey || !permission.actionKeys.includes(viewKey))) {
      return [{ featureCode: feature.code, message: "Quyền thao tác cần đi kèm quyền Xem." }];
    }

    if (!feature.scope && permission.dataScopeId !== null) {
      return [{ featureCode: feature.code, message: "Chức năng này không hỗ trợ phạm vi dữ liệu." }];
    }

    if (feature.scope) {
      const hasGrantedAction = permission.actionKeys.length > 0;
      const isScopeSupported = feature.scope.options.some(
        (option) => option.id === permission.dataScopeId,
      );
      if (hasGrantedAction && feature.scope.requiredWhenGranted && !isScopeSupported) {
        return [{ featureCode: feature.code, message: "Vui lòng chọn phạm vi dữ liệu." }];
      }
      if (permission.dataScopeId !== null && !isScopeSupported) {
        return [{ featureCode: feature.code, message: "Phạm vi dữ liệu không được hỗ trợ." }];
      }
    }

    return [];
  });
}
