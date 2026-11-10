"use client";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { EmployeeDirectory } from "./employee-directory";

// The editor lives in its own module; keep exporting it from here for existing importers.
export { EmployeeApiEditor } from "./employee-editor";

/** Employee management is available to the Cooperative Owner only. */
export function EmployeeApiScreen() {
  const context = useApiWorkspace();
  return context.identity.subjectType === "CooperativeOwner" ? (
    <EmployeeDirectory />
  ) : (
    <p role="alert">Bạn không có quyền quản lý nhân viên.</p>
  );
}
