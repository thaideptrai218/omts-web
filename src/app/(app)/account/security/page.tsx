import { PersonalApiScreen } from "@/features/personal-api/profile-screen";
import { ApiPage } from "@/features/api-workspace/api-page";
export const instant = false;
export default function AccountSecurityPage() {
  return <ApiPage api={<PersonalApiScreen initialTab="security" />}><p>Vui lòng đổi mật khẩu trong hồ sơ cá nhân.</p></ApiPage>;
}
