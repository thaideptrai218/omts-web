import { notFound } from "next/navigation";
import { SYSTEM_ADMIN_ACCOUNTS_ENABLED } from "@/features/admin-api/availability";
import { ApiPage } from "@/features/api-workspace/api-page";
import { AdminScreen } from "@/features/admin-api/screen";
export const instant = false;
export default function AdminAccountsPage() {
  if (!SYSTEM_ADMIN_ACCOUNTS_ENABLED) notFound();
  return <ApiPage api={<AdminScreen />}><p>Chức năng quản trị tài khoản sử dụng bản kết nối API.</p></ApiPage>;
}
