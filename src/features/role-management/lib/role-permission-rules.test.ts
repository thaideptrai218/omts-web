import { describe, expect, it } from "vitest";
import type { FeatureCatalogItem } from "@/features/role-management/domain/role-management";
import {
  createEmptyPermission,
  isViewLocked,
  setPermissionScope,
  togglePermissionAction,
  validatePermissionMatrix,
} from "@/features/role-management/lib/role-permission-rules";

const feature = {
  code: "EMPLOYEE",
  groupLabel: "Nhân sự",
  label: "Hồ sơ nhân viên",
  scope: {
    options: [
      { id: "OWN", label: "Của mình" },
      { id: "ZONE", label: "Toàn bộ trong khu được gán" },
    ],
    requiredWhenGranted: true,
  },
  supportedActions: [
    { category: "create", key: "CREATE", label: "Tạo" },
    { category: "view", key: "VIEW", label: "Xem" },
    { category: "edit", key: "EDIT", label: "Sửa" },
  ],
} as const satisfies FeatureCatalogItem;

describe("role permission implication rules", () => {
  it("automatically adds View when another action is selected", () => {
    const result = togglePermissionAction(
      createEmptyPermission(feature.code),
      feature,
      "EDIT",
      true,
    );

    expect(result.actionKeys).toEqual(["EDIT", "VIEW"]);
    expect(isViewLocked(result, feature)).toBe(true);
  });

  it("does not remove View while another action remains", () => {
    const permission = {
      actionKeys: ["VIEW", "CREATE"],
      dataScopeId: "ZONE",
      featureCode: feature.code,
    };

    expect(togglePermissionAction(permission, feature, "VIEW", false)).toEqual(
      permission,
    );
  });

  it("ignores actions and scopes that are not supported by the catalog", () => {
    const permission = createEmptyPermission(feature.code);

    expect(togglePermissionAction(permission, feature, "DELETE", true)).toEqual(
      permission,
    );
    expect(setPermissionScope(permission, feature, "GLOBAL").dataScopeId).toBeNull();
  });

  it("rejects a mutation permission without View", () => {
    const errors = validatePermissionMatrix(
      [{ actionKeys: ["EDIT"], dataScopeId: "ZONE", featureCode: feature.code }],
      [feature],
    );

    expect(errors[0]?.message).toContain("quyền Xem");
  });

  it("requires a catalog-supported scope only when the feature says so", () => {
    const errors = validatePermissionMatrix(
      [{ actionKeys: ["VIEW"], dataScopeId: null, featureCode: feature.code }],
      [feature],
    );

    expect(errors[0]?.message).toContain("phạm vi dữ liệu");
  });

  it("rejects duplicate rows for the same feature", () => {
    const row = {
      actionKeys: ["VIEW"],
      dataScopeId: "ZONE",
      featureCode: feature.code,
    };

    expect(validatePermissionMatrix([row, row], [feature])[0]?.message).toContain(
      "một dòng quyền",
    );
  });

  it("rejects a feature that is absent from the catalog", () => {
    const errors = validatePermissionMatrix(
      [
        { actionKeys: ["VIEW"], dataScopeId: null, featureCode: "UNKNOWN" },
        { actionKeys: ["VIEW"], dataScopeId: "ZONE", featureCode: feature.code },
      ],
      [feature],
    );

    expect(errors[0]?.featureCode).toBe("UNKNOWN");
  });
});
