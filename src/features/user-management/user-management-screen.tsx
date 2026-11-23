"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Subtabs } from "@/components/ui/management-screen/management-table";
import { ScreenGuide } from "@/components/ui/screen-guide";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { PermissionDeniedNotice } from "@/features/employee-api/permission-denied-notice";
import { UserAccountsTab } from "./user-accounts-tab";
import { UserRolesTab } from "./user-roles-tab";
import { useUserAccounts } from "./use-user-accounts";

export type UserManagementTab = "accounts" | "roles";
const tabs = [{ key: "accounts", label: "Tài khoản" }, { key: "roles", label: "Vai trò" }] satisfies readonly { key: UserManagementTab; label: string }[];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * "Quản lý người dùng" (/workspace/accounts and /workspace/roles): create a user, grant role and zones, see who can do what,
 * all in one screen. Owner only, like the backend (`RequireCooperativeOwner`). A single valid `?accountId=` opens that user.
 */
export function UserManagementScreen({ initialTab = "accounts" }: { initialTab?: UserManagementTab }) {
  const context = useApiWorkspace();
  if (context.identity.subjectType !== "CooperativeOwner") return <PermissionDeniedNotice />;
  return <UserManagementContent initialTab={initialTab} />;
}

function UserManagementContent({ initialTab }: { initialTab: UserManagementTab }) {
  const [tab, setTab] = useState<UserManagementTab>(initialTab);
  const ids = useSearchParams().getAll("accountId");
  const initialAccountId = ids.length === 1 && UUID_PATTERN.test(ids[0]) ? ids[0] : undefined;
  // One load shared by both tabs: the roles tab counts holders from the same accounts.
  const data = useUserAccounts();
  return <div className="space-y-3">
    <Subtabs<UserManagementTab> label="Quản lý người dùng" tabs={tabs} value={tab} onChange={setTab} idPrefix="user-management" />
    {tab === "accounts"
      ? <ScreenGuide id="user-management-accounts" steps={[
        { title: "Bấm Tạo người dùng", text: "Nhập thông tin của người sẽ dùng ứng dụng." },
        { title: "Chọn vai trò và vùng", text: "Quản lý vùng làm việc theo từng vùng. Kế toán chỉ có một và làm cho cả hợp tác xã." },
        { title: "Gửi mật khẩu tạm cho họ", text: "Mật khẩu tạm chỉ hiện một lần ngay sau khi tạo, hãy ghi lại." },
      ]} />
      : <ScreenGuide id="user-management-roles" steps={[
        { title: "Chỉ có hai vai trò", text: "Quản lý vùng và Kế toán. Không tạo, sửa hay xóa vai trò được." },
        { title: "Bấm Xem quyền", text: "Xem vai trò đó được xem, tạo, sửa việc gì; bảng bên dưới chỉ để đọc." },
        { title: "Gán ở tab Tài khoản", text: "Muốn đổi quyền của một người, mở người đó rồi chọn vai trò và vùng." },
      ]} />}
    <div role="tabpanel" id={`user-management-panel-${tab}`} aria-labelledby={`user-management-tab-${tab}`}>
      {tab === "accounts" ? <UserAccountsTab data={data} initialAccountId={initialAccountId} /> : <UserRolesTab accounts={data.accounts} />}
    </div>
  </div>;
}
