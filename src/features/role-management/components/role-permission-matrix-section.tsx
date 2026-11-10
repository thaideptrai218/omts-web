"use client";

import type { ComponentProps } from "react";
import { PermissionMatrixEditor } from "@/features/role-management/components/permission-matrix-editor";

/** "Ma trận quyền" heading, helper copy and the permission matrix of the role editor. */
export function RolePermissionMatrixSection(
  props: ComponentProps<typeof PermissionMatrixEditor>,
) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-text">Ma trận quyền</h3>
        <p className="mt-1 text-sm leading-6 text-text-muted">
          Chọn quyền theo từng chức năng. Khi có quyền thao tác, quyền Xem
          được bật và giữ tự động.
        </p>
      </div>
      <PermissionMatrixEditor {...props} />
    </div>
  );
}
