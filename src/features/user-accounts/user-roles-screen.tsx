"use client";
import { ManagementHeading } from "@/components/ui/management-page";
import { ScreenGuide } from "@/components/ui/screen-guide";
import { RolePermissionsPanel } from "@/features/account-access/role-permissions-panel";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { PermissionDeniedNotice } from "@/features/employee-api/permission-denied-notice";

/** "Vai trò và quyền" (Cài đặt > Người dùng): the two fixed roles and what each may do, read only. Owner only, like the backend. */
export function UserRolesScreen() {
  const context = useApiWorkspace();
  if (context.identity.subjectType !== "CooperativeOwner") return <PermissionDeniedNotice />;
  return <section className="space-y-4">
    <ScreenGuide id="user-roles-screen-v1" steps={[
      { title: "Hai vai trò cố định", text: "Quản lý vùng và Kế toán. Bạn chọn vai trò cho từng người ở Tài khoản người dùng, không tạo thêm vai trò.", target: 'section[aria-label="Vai trò"] article' },
      { title: "Xem quyền chi tiết", text: "Bấm Xem quyền của vai trò để đọc từng chức năng vai trò đó được xem, làm hay duyệt.", target: "text:Xem quyền của vai trò" },
    ]} />
    <ManagementHeading title="Vai trò và quyền" description="Hai vai trò cố định của hợp tác xã và quyền của từng vai trò. Chỉ để xem." icon="roles" />
    <RolePermissionsPanel />
  </section>;
}
