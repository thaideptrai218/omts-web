"use client";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { EmployeeDirectory } from "./employee-directory";
import { canReadEmployees } from "./employee-read-access";

// The editor lives in its own module; keep exporting it from here for existing importers.
export { EmployeeApiEditor } from "./employee-editor";

/** Employee management is the Cooperative Owner's; the Accountant opens the same list read-only (no add, import, export or edit). */
export function EmployeeApiScreen() {
  const context = useApiWorkspace();
  if (!canReadEmployees(context.identity, context.permissions.functionPermissions)) return <p role="alert">Bạn không có quyền xem nhân viên.</p>;
  return <EmployeeDirectory readOnly={context.identity.subjectType !== "CooperativeOwner"} />;
}
