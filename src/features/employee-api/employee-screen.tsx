"use client";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { EmployeeDirectory } from "./employee-directory";
import { employeeViewerAccess } from "./employee-viewer-access";
import { PermissionDeniedNotice } from "./permission-denied-notice";


/**
 * Employee management is the Cooperative Owner's. A Zone Manager opens the same list read-only on working information;
 * the Accountant (PAYROLL View) also sees pay columns and payroll tabs. Neither adds, imports, exports or edits.
 */
export function EmployeeApiScreen() {
  const context = useApiWorkspace();
  const access = employeeViewerAccess(context.identity, context.permissions.functionPermissions);
  if (!access.read) return <PermissionDeniedNotice message="Bạn không có quyền xem nhân viên." />;
  return <EmployeeDirectory readOnly={!access.manage} access={access} />;
}
