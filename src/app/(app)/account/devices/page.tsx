import { PersonalApiScreen } from "@/features/personal-api/profile-screen";
import { ApiPage } from "@/features/api-workspace/api-page";
export const instant = false;
export default function AccountDevicesPage() {
  return <ApiPage api={<PersonalApiScreen initialTab="devices" />}><p>Danh sách thiết bị đăng nhập chỉ có khi hệ thống chạy với máy chủ thật.</p></ApiPage>;
}
