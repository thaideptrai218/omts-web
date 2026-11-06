import { ApiPage } from "@/features/api-workspace/api-page";
import { AdminScreen } from "@/features/admin-api/screen";
export const instant = false;
export default function AdminAccountsPage() { return <ApiPage api={<AdminScreen />}><p>Chức năng quản trị tài khoản sử dụng bản kết nối API.</p></ApiPage>; }
